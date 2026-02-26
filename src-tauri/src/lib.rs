mod oauth;
mod session;
mod contract;
mod watcher;
mod sync_client;
mod offline_tracker;
mod local_db;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

/// 앱 전역 상태: 멀티 프로젝트 감시 + 로컬 DB
struct AppState {
    /// repo_full_name → WatcherState 매핑
    watchers: Mutex<HashMap<String, watcher::WatcherState>>,
    /// repo_full_name → 로컬 경로 매핑
    project_paths: Mutex<HashMap<String, PathBuf>>,
    /// 전체 감시 활성화 여부
    watching_enabled: Mutex<bool>,
    /// 로컬 SQLite DB
    db: local_db::LocalDb,
    /// Supabase 이벤트 전송 클라이언트
    sync_client: Option<Arc<sync_client::SyncClient>>,
}

#[tauri::command]
async fn start_oauth_server(app: tauri::AppHandle) -> Result<String, String> {
    let (server, listener) = oauth::OAuthServer::new()
        .await
        .map_err(|e| format!("서버 시작 실패: {}", e))?;

    let callback_url = server.callback_url();

    tauri::async_runtime::spawn(async move {
        oauth::start_callback_server(listener, app).await;
    });

    Ok(callback_url)
}

/// 프로젝트 감시 추가 (import된 프로젝트에서 호출)
/// repo_full_name: "owner/repo", path: 로컬 경로
#[tauri::command]
async fn add_watch_project(
    app: tauri::AppHandle,
    repo_full_name: String,
    path: String,
) -> Result<String, String> {
    let project_path = PathBuf::from(&path);
    if !project_path.exists() {
        return Err(format!("경로가 존재하지 않음: {}", path));
    }

    let state = app.state::<AppState>();

    // 감시 비활성화 상태면 경로만 저장
    let enabled = *state.watching_enabled.lock().map_err(|e| e.to_string())?;

    // 기존 watcher가 있으면 중지
    {
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        if let Some(w) = watchers.remove(&repo_full_name) {
            watcher::stop_watcher(&w);
        }
    }

    // 경로 저장 (메모리 + DB)
    {
        let mut paths = state.project_paths.lock().map_err(|e| e.to_string())?;
        paths.insert(repo_full_name.clone(), project_path.clone());
    }
    state.db.upsert_watcher_path(&repo_full_name, &path).map_err(|e| e.to_string())?;

    // 감시 활성화 상태면 watcher 시작
    if enabled {
        let sc = state.sync_client.clone();
        let watcher_state = watcher::start_watcher(project_path, app.clone(), sc)?;
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        watchers.insert(repo_full_name.clone(), watcher_state);
    }

    Ok(format!("👁 {}: watching {}", repo_full_name, path))
}

/// 프로젝트 감시 제거
#[tauri::command]
async fn remove_watch_project(
    app: tauri::AppHandle,
    repo_full_name: String,
) -> Result<String, String> {
    let state = app.state::<AppState>();

    // watcher 중지
    {
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        if let Some(w) = watchers.remove(&repo_full_name) {
            watcher::stop_watcher(&w);
        }
    }

    // 경로 제거 (메모리 + DB)
    {
        let mut paths = state.project_paths.lock().map_err(|e| e.to_string())?;
        paths.remove(&repo_full_name);
    }
    state.db.delete_watcher_path(&repo_full_name).map_err(|e| e.to_string())?;

    Ok(format!("⏹ {} 감시 제거", repo_full_name))
}

/// 전체 감시 토글 (트레이 메뉴에서 사용)
#[tauri::command]
async fn toggle_watch_all(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let mut enabled = state.watching_enabled.lock().map_err(|e| e.to_string())?;

    if *enabled {
        // 전체 중지
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;
        for (name, w) in watchers.iter() {
            watcher::stop_watcher(w);
            log::info!("⏸ {} 감시 중지", name);
        }
        watchers.clear();
        *enabled = false;
    } else {
        // 전체 시작
        let paths = state.project_paths.lock().map_err(|e| e.to_string())?;
        let mut watchers = state.watchers.lock().map_err(|e| e.to_string())?;

        for (name, path) in paths.iter() {
            let sc = state.sync_client.clone();
            match watcher::start_watcher(path.clone(), app.clone(), sc) {
                Ok(ws) => {
                    watchers.insert(name.clone(), ws);
                    log::info!("👁 {} 감시 시작", name);
                }
                Err(e) => log::error!("❌ {} 감시 실패: {}", name, e),
            }
        }
        *enabled = true;
    }

    Ok(serde_json::json!({
        "enabled": *enabled,
        "project_count": state.project_paths.lock().map(|p| p.len()).unwrap_or(0),
    }))
}

/// 전체 감시 상태 조회
#[tauri::command]
async fn get_watch_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let enabled = *state.watching_enabled.lock().map_err(|e| e.to_string())?;
    let paths = state.project_paths.lock().map_err(|e| e.to_string())?;
    let watchers = state.watchers.lock().map_err(|e| e.to_string())?;

    let projects: Vec<serde_json::Value> = paths
        .iter()
        .map(|(name, path)| {
            let is_watching = watchers.contains_key(name);
            serde_json::json!({
                "repo_full_name": name,
                "path": path.to_string_lossy(),
                "watching": is_watching,
            })
        })
        .collect();

    Ok(serde_json::json!({
        "enabled": enabled,
        "projects": projects,
    }))
}

/// 앱 재시작 시 오프라인 변경 감지 (모든 등록 프로젝트)
#[tauri::command]
async fn get_offline_changes(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let paths = state.project_paths.lock().map_err(|e| e.to_string())?;

    let mut all_changes = Vec::new();
    for (name, path) in paths.iter() {
        let changes = offline_tracker::detect_offline_changes(path);
        all_changes.push(serde_json::json!({
            "repo_full_name": name,
            "changes": serde_json::to_value(&changes).unwrap_or_default(),
        }));
    }

    Ok(serde_json::json!(all_changes))
}

/// 로컬 디스크에서 git 레포 위치 자동 탐색
/// repo_urls: ["https://github.com/owner/repo.git", ...]
/// → { "owner/repo": "/Users/.../path" }
#[tauri::command]
async fn resolve_local_paths(repo_urls: Vec<String>) -> Result<serde_json::Value, String> {
    use std::process::Command;
    use std::path::Path;

    let home = dirs::home_dir().ok_or("홈 디렉토리를 찾을 수 없음")?;
    let home_str = home.to_string_lossy().to_string();

    // ─── macOS 코드 미관련 디렉토리 (탐색 제외) ───
    // 기본 시스템 폴더 + 미디어 폴더를 제외하고 나머지만 탐색
    let exclude_dirs: std::collections::HashSet<&str> = [
        "Library", "Applications", "Movies", "Music", "Pictures",
        "Public", ".Trash", ".cache", ".local", ".cargo", ".rustup",
        ".npm", ".nvm", ".pyenv", ".rbenv", ".config",
    ].iter().copied().collect();

    // find 공통 옵션 (경로 내부 제외)
    let find_excludes = vec![
        "-not", "-path", "*/node_modules/*",
        "-not", "-path", "*/.Trash/*",
        "-not", "-path", "*/Library/*",
        "-not", "-path", "*/.gemini/*",
        "-not", "-path", "*/target/*",
        "-not", "-path", "*/.git/modules/*",
        "-not", "-path", "*/.cache/*",
    ];

    // ─── 1단계: 홈 디렉토리 자식 폴더 동적 열거 ───
    let home_children: Vec<String> = match std::fs::read_dir(&home) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                !name.starts_with('.') && !exclude_dirs.contains(name.as_str())
            })
            .map(|e| e.path().to_string_lossy().to_string())
            .collect(),
        Err(_) => vec![],
    };

    log::info!("🔍 탐색 대상 디렉토리 {}개: {:?}",
        home_children.len(),
        home_children.iter().map(|p| p.replace(&home_str, "~")).collect::<Vec<_>>()
    );

    // ─── 2단계: 각 디렉토리별 find 실행 (depth 6) ───
    let mut all_git_dirs: Vec<String> = Vec::new();

    for search_dir in &home_children {
        let mut args = vec![
            search_dir.as_str(),
            "-maxdepth", "6",
            "-name", ".git",
            "-type", "d",
        ];
        args.extend_from_slice(&find_excludes);

        let output = Command::new("find")
            .args(&args)
            .output();

        if let Ok(o) = output {
            let stdout = String::from_utf8_lossy(&o.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    all_git_dirs.push(trimmed.to_string());
                }
            }
        }
    }

    // 홈 디렉토리 직하 .git도 체크 (드문 케이스)
    let home_git = home.join(".git");
    if home_git.exists() {
        all_git_dirs.push(home_git.to_string_lossy().to_string());
    }

    log::debug!("🔍 총 {}개 git 저장소 발견", all_git_dirs.len());

    // ─── URL 정규화 ───
    let normalized_urls: Vec<(String, String, String)> = repo_urls
        .iter()
        .map(|url| {
            let normalized = url
                .trim_end_matches(".git")
                .replace("git@github.com:", "https://github.com/")
                .to_lowercase();
            
            // 원본에서 https://github.com/ 부분만 제거하여 repo_full_name 추출 (대소문자 유지)
            let original_repo_name = url
                .trim_end_matches(".git")
                .replace("git@github.com:", "https://github.com/")
                .replace("https://github.com/", "");
                
            (url.clone(), normalized, original_repo_name)
        })
        .collect();

    let mut result: HashMap<String, String> = HashMap::new();
    let mut timestamps: HashMap<String, i64> = HashMap::new();

    // ─── 매칭 ───
    for git_dir in &all_git_dirs {
        let project_dir = match Path::new(git_dir).parent() {
            Some(p) => p,
            None => continue,
        };

        let remote = Command::new("git")
            .args(["remote", "get-url", "origin"])
            .current_dir(project_dir)
            .output();

        let remote_url = match remote {
            Ok(o) if o.status.success() => {
                String::from_utf8_lossy(&o.stdout).trim().to_string()
            }
            _ => continue,
        };

        let normalized_remote = remote_url
            .trim_end_matches(".git")
            .replace("git@github.com:", "https://github.com/")
            .to_lowercase();

        for (_original_url, normalized, original_repo_name) in &normalized_urls {
            if normalized_remote == *normalized {
                let repo_full_name = original_repo_name.clone();

                // 최근 커밋 타임스탬프 (중복 경로 → 최근 작업한 것 우선)
                let last_commit_ts = Command::new("git")
                    .args(["log", "-1", "--format=%ct"])
                    .current_dir(project_dir)
                    .output()
                    .ok()
                    .and_then(|o| {
                        if o.status.success() {
                            String::from_utf8_lossy(&o.stdout)
                                .trim()
                                .parse::<i64>()
                                .ok()
                        } else {
                            None
                        }
                    })
                    .unwrap_or(0);

                let should_replace = match timestamps.get(&repo_full_name) {
                    Some(&existing_ts) => last_commit_ts > existing_ts,
                    None => true,
                };

                if should_replace {
                    result.insert(repo_full_name.clone(), project_dir.to_string_lossy().to_string());
                    timestamps.insert(repo_full_name, last_commit_ts);
                }
                break;
            }
        }
    }

    log::info!("📍 자동 탐색: {}개 프로젝트 경로 발견", result.len());
    serde_json::to_value(&result).map_err(|e| e.to_string())
}

// ─── 로컬 DB Tauri 커맨드 ───

#[tauri::command]
async fn db_get_model_scores(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let scores = state.db.get_all_model_scores().map_err(|e| e.to_string())?;
    Ok(serde_json::json!(scores))
}

#[tauri::command]
async fn db_upsert_model_score(
    app: tauri::AppHandle,
    model_key: String,
    coding: f64,
    analysis: f64,
    documentation: f64,
    speed: f64,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    state.db.upsert_model_score(&model_key, coding, analysis, documentation, speed)
        .map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_get_editor_models(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let models = state.db.get_all_editor_models().map_err(|e| e.to_string())?;
    Ok(serde_json::json!(models))
}

#[tauri::command]
async fn db_upsert_editor_models(
    app: tauri::AppHandle,
    editor_type: String,
    supported_models: Vec<String>,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    state.db.upsert_editor_models(&editor_type, &supported_models)
        .map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_get_projects(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let projects = state.db.get_all_projects().map_err(|e| e.to_string())?;
    Ok(serde_json::json!(projects))
}

#[tauri::command]
async fn db_upsert_project(
    app: tauri::AppHandle,
    project: serde_json::Value,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    state.db.upsert_project(&project).map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_delete_project(
    app: tauri::AppHandle,
    id: String,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    log::info!("🗑 프로젝트 삭제 요청: {}", id);
    state.db.delete_project(&id).map_err(|e| {
        log::error!("❌ 프로젝트 삭제 실패: {} - {}", id, e);
        e.to_string()
    })?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_get_preference(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let state = app.state::<AppState>();
    state.db.get_preference(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn db_set_preference(app: tauri::AppHandle, key: String, value: String) -> Result<String, String> {
    let state = app.state::<AppState>();
    state.db.set_preference(&key, &value).map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_get_pending_sync(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let items = state.db.get_pending_sync().map_err(|e| e.to_string())?;
    Ok(serde_json::json!(items))
}

#[tauri::command]
async fn db_mark_synced(app: tauri::AppHandle, queue_ids: Vec<i64>) -> Result<String, String> {
    let state = app.state::<AppState>();
    state.db.mark_synced(&queue_ids).map_err(|e| e.to_string())?;
    Ok("ok".to_string())
}

#[tauri::command]
async fn db_upsert_syncable(
    app: tauri::AppHandle,
    table_name: String,
    record: serde_json::Value,
) -> Result<String, String> {
    // 테이블명 화이트리스트
    let allowed = ["work_items", "plans", "goals", "session_logs"];
    if !allowed.contains(&table_name.as_str()) {
        return Err(format!("허용되지 않은 테이블: {}", table_name));
    }
    let state = app.state::<AppState>();
    let id = state.db.upsert_syncable(&table_name, &record).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
async fn db_get_syncable(
    app: tauri::AppHandle,
    table_name: String,
) -> Result<serde_json::Value, String> {
    let allowed = ["work_items", "plans", "goals", "session_logs"];
    if !allowed.contains(&table_name.as_str()) {
        return Err(format!("허용되지 않은 테이블: {}", table_name));
    }
    let state = app.state::<AppState>();
    let items = state.db.get_all_syncable(&table_name).map_err(|e| e.to_string())?;
    Ok(serde_json::json!(items))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = local_db::LocalDb::open().expect("로컬 DB 초기화 실패");

    // 저장된 watcher 경로 복원
    let mut initial_paths = HashMap::new();
    if let Ok(paths) = db.get_all_watcher_paths() {
        for (name, path) in paths {
            initial_paths.insert(name, PathBuf::from(path));
        }
        log::info!("📂 저장된 watcher 경로 {}개 복원", initial_paths.len());
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage({
            // Supabase 설정 로드 → SyncClient 생성
            // 1) 환경변수 직접 체크 2) CWD/.env.local 3) exe 부모 디렉토리
            let env_url = std::env::var("VITE_SUPABASE_URL").ok();
            let env_key = std::env::var("VITE_SUPABASE_ANON_KEY").ok();

            let sync = if let (Some(url), Some(key)) = (env_url, env_key) {
                log::info!("🔗 SyncClient (환경변수): {}", url);
                Some(Arc::new(sync_client::SyncClient::new(
                    sync_client::SupabaseConfig { url, anon_key: key },
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
                )))
            } else {
                // .env.local / .env 파일 탐색
                let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

                
                // CWD에서 먼저 찾고, 없으면 exe 디렉토리에서 찾기
                let result = sync_client::load_supabase_config(&cwd)
                    .or_else(|| {
                        // Tauri 앱의 exe 디렉토리 상위 (src-tauri/target/debug → 프로젝트 루트)
                        if let Ok(exe_path) = std::env::current_exe() {
                            if let Some(project_root) = exe_path.parent()
                                .and_then(|p| p.parent())
                                .and_then(|p| p.parent())
                                .and_then(|p| p.parent()) {

                                return sync_client::load_supabase_config(project_root);
                            }
                        }
                        None
                    });
                
                result.map(|config| {
                    log::info!("🔗 SyncClient (.env): {}", config.url);
                    Arc::new(sync_client::SyncClient::new(config, cwd.clone()))
                })
            };

            if sync.is_some() {
                log::info!("✅ SyncClient 초기화 성공 → Supabase 이벤트 전송 활성화");
            } else {
                log::warn!("⚠ SyncClient 초기화 실패 → .env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 필요");
            }
            AppState {
                watchers: Mutex::new(HashMap::new()),
                project_paths: Mutex::new(initial_paths),
                watching_enabled: Mutex::new(true),
                db,
                sync_client: sync.clone(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_oauth_server,
            add_watch_project,
            remove_watch_project,
            toggle_watch_all,
            get_watch_status,
            get_offline_changes,
            resolve_local_paths,
            db_get_model_scores,
            db_upsert_model_score,
            db_get_editor_models,
            db_upsert_editor_models,
            db_get_projects,
            db_upsert_project,
            db_delete_project,
            db_get_preference,
            db_set_preference,
            db_get_pending_sync,
            db_mark_synced,
            db_upsert_syncable,
            db_get_syncable,
        ])
        .setup(|app| {
            // ─── 시스템 트레이 ───
            let show_item = MenuItem::with_id(app, "show", "Orchestrator 열기", true, None::<&str>)?;
            let watch_item = MenuItem::with_id(app, "watch_toggle", "⏸ Watch 전체 중지", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &watch_item, &quit_item])?;

            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Orchestrator")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "watch_toggle" => {
                            let state = app.state::<AppState>();
                            let mut enabled = state.watching_enabled.lock().unwrap();

                            if *enabled {
                                // 전체 중지
                                if let Ok(mut watchers) = state.watchers.lock() {
                                    for (name, w) in watchers.iter() {
                                        watcher::stop_watcher(w);

                                    }
                                    watchers.clear();
                                }
                                *enabled = false;
                                log::info!("트레이: 전체 Watch 중지");
                            } else {
                                // 전체 시작
                                if let Ok(paths) = state.project_paths.lock() {
                                    if let Ok(mut watchers) = state.watchers.lock() {
                                        for (name, path) in paths.iter() {
                                            let sc = state.sync_client.clone();
                                            match watcher::start_watcher(path.clone(), app.clone(), sc) {
                                                Ok(ws) => {
                                                    watchers.insert(name.clone(), ws);

                                                }
                                                Err(e) => log::error!("❌ {} 감시 실패: {}", name, e),
                                            }
                                        }
                                    }
                                }
                                *enabled = true;
                                log::info!("트레이: 전체 Watch 시작");
                            }
                        }
                        "quit" => {
                            // Graceful shutdown
                            let state = app.state::<AppState>();

                            // 모든 watcher 중지
                            if let Ok(watchers) = state.watchers.lock() {
                                for (_, w) in watchers.iter() {
                                    watcher::stop_watcher(w);
                                }
                            }

                            // 모든 프로젝트에 shutdown timestamp 저장
                            if let Ok(paths) = state.project_paths.lock() {
                                for (_, path) in paths.iter() {
                                    session::save_shutdown_timestamp(path);
                                }
                            }

                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // ─── 로그 플러그인 ───
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            // ─── 알림 플러그인 ───
            app.handle().plugin(tauri_plugin_notification::init())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // 창 닫기 시 트레이에 상주 (앱 종료 대신 숨김)
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
