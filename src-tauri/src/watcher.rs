// ===========================================
// watcher.rs — 파일 감시 (orchx watch 재작성)
// notify crate 기반 FSEvents 네이티브 파일 감시
// ===========================================

use crate::contract::ContractEnforcer;
use crate::session::{read_session, update_session_stats};
use crate::sync_client::SyncClient;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// 무시할 디렉토리 패턴
const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".orchestrator",
    "dist",
    "build",
    ".next",
    "target",
    ".tauri",
];

/// 파일 변경 이벤트 (프론트엔드로 전송)
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileChangeEvent {
    pub path: String,
    pub event_type: String, // "change" | "add" | "unlink"
    pub violation: Option<String>,
}

/// Watcher 상태
pub struct WatcherState {
    _watcher: RecommendedWatcher,
    pub running: Arc<AtomicBool>,
}

/// 경로가 무시 대상인지 체크
fn is_ignored(path: &Path, project_root: &Path) -> bool {
    let relative = path
        .strip_prefix(project_root)
        .unwrap_or(path);

    for component in relative.components() {
        if let std::path::Component::Normal(name) = component {
            let name_str = name.to_string_lossy();
            if IGNORED_DIRS.iter().any(|d| *d == name_str.as_ref()) {
                return true;
            }
        }
    }
    false
}

/// 이벤트 종류를 문자열로 변환
fn event_kind_to_str(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("add"),
        EventKind::Modify(_) => Some("change"),
        EventKind::Remove(_) => Some("unlink"),
        _ => None,
    }
}

/// 프로젝트 디렉토리에 대한 파일 감시 시작
pub fn start_watcher(
    project_path: PathBuf,
    app_handle: tauri::AppHandle,
    sync_client: Option<Arc<SyncClient>>,
) -> Result<WatcherState, String> {
    let running = Arc::new(AtomicBool::new(true));
    let files_changed = Arc::new(AtomicU64::new(0));
    let commits_detected = Arc::new(AtomicU64::new(0));

    // 세션에서 계약 정보 로드
    let session = read_session(&project_path);
    let enforcer = Arc::new(
        session
            .as_ref()
            .and_then(|s| s.execution_contract.clone())
            .map(ContractEnforcer::new)
            .unwrap_or_else(|| {
                ContractEnforcer::new(crate::session::ExecutionContract::default())
            }),
    );

    // 기존 세션 통계 로드
    if let Some(ref s) = session {
        files_changed.store(s.files_changed, Ordering::SeqCst);
        commits_detected.store(s.commits_detected, Ordering::SeqCst);
    }

    // 디바운스용 버퍼 (경로 -> 마지막 이벤트 시간)
    let debounce_map: Arc<Mutex<HashMap<String, std::time::Instant>>> = 
        Arc::new(Mutex::new(HashMap::new()));

    let project_root = project_path.clone();
    let project_root_for_stats = project_path.clone();
    let app = app_handle.clone();
    let enforcer_clone = enforcer.clone();
    let files_changed_clone = files_changed.clone();
    let running_clone = running.clone();
    let sync_clone = sync_client.clone();
    let debounce_map_clone = debounce_map.clone();

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if !running_clone.load(Ordering::SeqCst) {
            return;
        }

        let event = match res {
            Ok(e) => e,
            Err(e) => {
                log::warn!("🔴 Watcher 에러: {:?}", e);
                return;
            }
        };



        let event_type = match event_kind_to_str(&event.kind) {
            Some(t) => t,
            None => {
                return;
            }
        };

        for path in &event.paths {
            // 무시 대상 체크
            if is_ignored(path, &project_root) {
                continue;
            }

            let relative = path
                .strip_prefix(&project_root)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();

            // 이중 체크 (정규식 기반)
            if relative.starts_with(".orchestrator")
                || relative.starts_with(".git/")
                || relative.contains("node_modules")
            {
                continue;
            }

            // .git/refs 변경 = 커밋 감지
            if path.to_string_lossy().contains(".git/refs") {
                let count = commits_detected.fetch_add(1, Ordering::SeqCst) + 1;
                let _ = app.emit("orchx:commit-detected", count);
                update_session_stats(
                    &project_root_for_stats,
                    files_changed_clone.load(Ordering::SeqCst),
                    count,
                );
                continue;
            }

            // 디바운스 처리 (1초 이내 동일 파일 변경 무시)
            {
                let mut map = debounce_map_clone.lock().unwrap();
                let now = std::time::Instant::now();
                if let Some(last_time) = map.get(&relative) {
                    if now.duration_since(*last_time).as_millis() < 1000 {
                        continue;
                    }
                }
                map.insert(relative.clone(), now);
            }

            let count = files_changed_clone.fetch_add(1, Ordering::SeqCst) + 1;

            // 계약 위반 체크
            let violation = enforcer_clone.check_path(&relative);
            let violation_msg = violation.as_ref().map(|v| v.reason.clone());

            // 이벤트 발행
            let change_event = FileChangeEvent {
                path: relative.clone(),
                event_type: event_type.to_string(),
                violation: violation_msg,
            };

            log::debug!("📝 파일변경: {} ({})", change_event.path, change_event.event_type);

            match app.emit("orchx:file-change", &change_event) {
                Ok(_) => {}
                Err(e) => log::warn!("  ❌ Tauri emit 실패: {}", e),
            }

            // Supabase cli_events에 이벤트 전송 (비동기)
            if let Some(ref client) = sync_clone {
                let client = client.clone();
                let rel = change_event.path.clone();
                let viol = change_event.violation.clone();
                tauri::async_runtime::spawn(async move {
                    let payload = serde_json::json!({
                        "file": rel,
                        "event_type": "change",
                        "violation": viol,
                    });
                    if let Err(e) = client.send_event("file.changed", payload).await {
                        log::warn!("  ❌ Supabase 전송 실패: {}", e);
                    }
                });
            } else {
                log::warn!("  ⚠ SyncClient 없음 → Supabase 전송 스킵");
            }

            // 세션 업데이트
            update_session_stats(
                &project_root_for_stats,
                count,
                commits_detected.load(Ordering::SeqCst),
            );
        }
    })
    .map_err(|e| format!("Watcher 생성 실패: {}", e))?;

    // 프로젝트 디렉토리 감시 시작
    watcher
        .watch(&project_path, RecursiveMode::Recursive)
        .map_err(|e| format!("감시 시작 실패: {}", e))?;

    log::info!("👁 Watching: {}", project_path.display());

    if let Some(ref s) = session {
        log::info!(
            "  Agent: {} | Task: {}",
            s.agent_type,
            s.task_name
        );
    }

    Ok(WatcherState {
        _watcher: watcher,
        running,
    })
}

/// Watcher 중지
pub fn stop_watcher(state: &WatcherState) {
    state.running.store(false, Ordering::SeqCst);
    log::info!("⏸ Watcher stopped");
}
