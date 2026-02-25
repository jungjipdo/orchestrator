// ===========================================
// offline_tracker.rs — 오프라인 변경 추적
// 앱 재시작 시 git diff + timestamp로 변경 감지
// ===========================================

use crate::session;
use std::path::Path;
use std::process::Command;

/// 오프라인 동안 변경된 파일 목록
#[derive(Debug, Clone, serde::Serialize)]
pub struct OfflineChanges {
    /// git diff로 감지된 변경 파일 (커밋되지 않은 변경)
    pub git_changes: Vec<String>,
    /// timestamp 기반으로 감지된 파일 (git 외 영역 포함)
    pub timestamp_changes: Vec<String>,
    /// 마지막 종료 시간
    pub last_shutdown: Option<String>,
}

/// git diff --stat HEAD로 커밋되지 않은 변경 파일 목록 조회
fn detect_git_changes(project_path: &Path) -> Vec<String> {
    let output = Command::new("git")
        .args(["diff", "--name-only", "HEAD"])
        .current_dir(project_path)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout
                .lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        }
        _ => Vec::new(),
    }
}

/// timestamp 기반 변경 파일 감지
/// 마지막 종료 이후 수정된 파일 목록 반환
fn detect_timestamp_changes(
    project_path: &Path,
    since: &chrono::DateTime<chrono::Utc>,
) -> Vec<String> {
    let since_systime = std::time::SystemTime::from(*since);
    let mut changed = Vec::new();

    let ignored = ["node_modules", ".git", "dist", "build", ".next", "target", ".orchestrator"];

    let walker = walkdir::WalkDir::new(project_path)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !ignored.iter().any(|i| *i == name.as_ref())
        });

    for entry in walker.filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }

        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                if modified > since_systime {
                    if let Ok(rel) = entry.path().strip_prefix(project_path) {
                        changed.push(rel.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    changed
}

/// 앱 재시작 시 오프라인 변경 감지 (A+B 조합)
pub fn detect_offline_changes(project_path: &Path) -> OfflineChanges {
    let last_shutdown = session::read_shutdown_timestamp(project_path);

    // A: git diff
    let git_changes = detect_git_changes(project_path);

    // B: timestamp 기반 (last_shutdown이 있을 때만)
    let timestamp_changes = match &last_shutdown {
        Some(ts) => detect_timestamp_changes(project_path, ts),
        None => Vec::new(),
    };

    if !git_changes.is_empty() {
        log::info!(
            "📋 오프라인 변경 감지: git {}개 파일",
            git_changes.len()
        );
    }
    if !timestamp_changes.is_empty() {
        log::info!(
            "📋 오프라인 변경 감지: timestamp {}개 파일",
            timestamp_changes.len()
        );
    }

    OfflineChanges {
        git_changes,
        timestamp_changes,
        last_shutdown: last_shutdown.map(|t| t.to_rfc3339()),
    }
}
