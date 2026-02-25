// ===========================================
// session.rs — 세션 관리 (orchx session 재작성)
// .orchestrator/session.json 읽기/쓰기
// ===========================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 실행 계약서 (allowed_paths, allowed_commands)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExecutionContract {
    #[serde(default)]
    pub allowed_paths: Vec<String>,
    #[serde(default)]
    pub allowed_commands: Vec<String>,
}

/// orchx 세션 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub session_id: String,
    pub agent_type: String,
    pub task_name: String,
    #[serde(default)]
    pub files_changed: u64,
    #[serde(default)]
    pub commits_detected: u64,
    #[serde(default)]
    pub execution_contract: Option<ExecutionContract>,
}

/// .orchestrator 디렉토리 경로
fn orchestrator_dir(project_path: &Path) -> PathBuf {
    project_path.join(".orchestrator")
}

/// 세션 파일 경로
fn session_file(project_path: &Path) -> PathBuf {
    orchestrator_dir(project_path).join("session.json")
}

/// 세션 읽기 — 없으면 None
pub fn read_session(project_path: &Path) -> Option<Session> {
    let path = session_file(project_path);
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

/// 세션 통계 업데이트
pub fn update_session_stats(project_path: &Path, files_changed: u64, commits_detected: u64) {
    let path = session_file(project_path);
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(mut session) = serde_json::from_str::<Session>(&content) {
            session.files_changed = files_changed;
            session.commits_detected = commits_detected;
            if let Ok(updated) = serde_json::to_string_pretty(&session) {
                let _ = fs::write(&path, updated);
            }
        }
    }
}

/// 마지막 종료 타임스탬프 저장
pub fn save_shutdown_timestamp(project_path: &Path) {
    let dir = orchestrator_dir(project_path);
    let _ = fs::create_dir_all(&dir);
    let now = chrono::Utc::now().to_rfc3339();
    let _ = fs::write(dir.join("last_shutdown"), now);
}

/// 마지막 종료 타임스탬프 읽기
pub fn read_shutdown_timestamp(project_path: &Path) -> Option<chrono::DateTime<chrono::Utc>> {
    let path = orchestrator_dir(project_path).join("last_shutdown");
    let content = fs::read_to_string(&path).ok()?;
    content.trim().parse().ok()
}
