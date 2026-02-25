// ===========================================
// sync_client.rs — 서버 통신 (orchx sync 재작성)
// reqwest 기반 Supabase REST API 호출
// 멱등성(UUID) + 실패 재시도 + 로컬 저장
// ===========================================

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// CLI 이벤트
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliEvent {
    pub event_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub status: String,
    pub retry_count: u32,
}

/// 실패 이벤트 (로컬 저장)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedEvent {
    pub event_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub session_id: Option<String>,
    pub failed_at: String,
    pub retry_count: u32,
    pub error: String,
}

/// Supabase 환경 설정
#[derive(Debug, Clone)]
pub struct SupabaseConfig {
    pub url: String,
    pub anon_key: String,
}

/// Sync 클라이언트
pub struct SyncClient {
    client: reqwest::Client,
    config: SupabaseConfig,
    project_path: PathBuf,
    pub repo_full_name: Option<String>,
}

impl SyncClient {
    pub fn new(config: SupabaseConfig, project_path: PathBuf) -> Self {
        Self {
            client: reqwest::Client::new(),
            config,
            project_path,
            repo_full_name: None,
        }
    }

    /// .git/config에서 remote URL → repo_full_name 추출
    pub fn resolve_repo_name(&mut self) -> Option<String> {
        let git_config = self.project_path.join(".git").join("config");
        let content = fs::read_to_string(&git_config).ok()?;

        // [remote "origin"] 섹션에서 url 추출
        let url_line = content
            .lines()
            .skip_while(|l| !l.contains("[remote \"origin\"]"))
            .skip(1)
            .take_while(|l| !l.starts_with('['))
            .find(|l| l.trim().starts_with("url"))?;

        let raw_url = url_line.split('=').nth(1)?.trim();

        // SSH: git@github.com:owner/repo.git → owner/repo
        let repo = if raw_url.contains("git@") {
            raw_url
                .split(':')
                .nth(1)?
                .trim_end_matches(".git")
                .to_string()
        } else {
            // HTTPS: https://github.com/owner/repo.git → owner/repo
            let parts: Vec<&str> = raw_url.trim_end_matches(".git").split('/').collect();
            if parts.len() >= 2 {
                format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
            } else {
                return None;
            }
        };

        self.repo_full_name = Some(repo.clone());
        log::info!("🔗 저장소: {}", repo);
        Some(repo)
    }

    /// 이벤트 전송 (멱등성: event_id UNIQUE 제약)
    pub async fn send_event(
        &self,
        event_type: &str,
        payload: serde_json::Value,
    ) -> Result<(), String> {
        let session = crate::session::read_session(&self.project_path);
        let event_id = uuid::Uuid::new_v4().to_string();

        let mut event_payload = payload;
        if let Some(ref repo) = self.repo_full_name {
            if let Some(obj) = event_payload.as_object_mut() {
                obj.insert(
                    "repo_full_name".to_string(),
                    serde_json::Value::String(repo.clone()),
                );
            }
        }

        let event = CliEvent {
            event_id: event_id.clone(),
            event_type: event_type.to_string(),
            payload: event_payload,
            session_id: session.as_ref().map(|s| s.session_id.clone()),
            project_id: None,
            status: "pending".to_string(),
            retry_count: 0,
        };

        let url = format!("{}/rest/v1/cli_events", self.config.url);
        let result = self
            .client
            .post(&url)
            .header("apikey", &self.config.anon_key)
            .header("Authorization", format!("Bearer {}", self.config.anon_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&event)
            .send()
            .await;

        match result {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() || status.as_u16() == 201 {
                    log::info!("✓ 이벤트 전송: {} ({}...)", event_type, &event_id[..8]);
                    Ok(())
                } else if status.as_u16() == 409 {
                    // UNIQUE 위반 = 이미 전송됨 (멱등성 보장)
                    log::warn!("⚠ 이벤트 {}... 이미 전송됨", &event_id[..8]);
                    Ok(())
                } else {
                    let body = resp.text().await.unwrap_or_default();
                    let msg = format!("전송 실패 ({}): {}", status, body);
                    self.save_failed_event(FailedEvent {
                        event_id,
                        event_type: event_type.to_string(),
                        payload: event.payload,
                        session_id: event.session_id,
                        failed_at: chrono::Utc::now().to_rfc3339(),
                        retry_count: 0,
                        error: msg.clone(),
                    });
                    Err(msg)
                }
            }
            Err(e) => {
                let msg = format!("네트워크 오류: {}", e);
                self.save_failed_event(FailedEvent {
                    event_id,
                    event_type: event_type.to_string(),
                    payload: event.payload,
                    session_id: event.session_id,
                    failed_at: chrono::Utc::now().to_rfc3339(),
                    retry_count: 0,
                    error: msg.clone(),
                });
                Err(msg)
            }
        }
    }

    /// 실패 이벤트 재전송 (최대 3회)
    pub async fn retry_failed(&self) -> (u32, u32) {
        let failed = self.load_failed_events();
        if failed.is_empty() {
            return (0, 0);
        }

        let mut succeeded = 0u32;
        let mut remaining = Vec::new();

        for event in &failed {
            if event.retry_count >= 3 {
                log::error!("✗ 이벤트 {}... 최대 재시도 초과", &event.event_id[..8]);
                remaining.push(event.clone());
                continue;
            }

            // Exponential backoff: 1s, 2s, 4s
            let delay = 2u64.pow(event.retry_count) * 1000;
            tokio::time::sleep(std::time::Duration::from_millis(delay)).await;

            let url = format!("{}/rest/v1/cli_events", self.config.url);
            let retry_event = CliEvent {
                event_id: event.event_id.clone(),
                event_type: event.event_type.clone(),
                payload: event.payload.clone(),
                session_id: event.session_id.clone(),
                project_id: None,
                status: "pending".to_string(),
                retry_count: event.retry_count + 1,
            };

            match self
                .client
                .post(&url)
                .header("apikey", &self.config.anon_key)
                .header("Authorization", format!("Bearer {}", self.config.anon_key))
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .json(&retry_event)
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() || resp.status().as_u16() == 409 => {
                    succeeded += 1;
                    log::info!(
                        "✓ 재전송 성공: {} ({}...)",
                        event.event_type,
                        &event.event_id[..8]
                    );
                }
                Ok(resp) => {
                    let body = resp.text().await.unwrap_or_default();
                    remaining.push(FailedEvent {
                        retry_count: event.retry_count + 1,
                        error: format!("재전송 실패: {}", body),
                        ..event.clone()
                    });
                }
                Err(e) => {
                    remaining.push(FailedEvent {
                        retry_count: event.retry_count + 1,
                        error: format!("네트워크 오류: {}", e),
                        ..event.clone()
                    });
                }
            }
        }

        self.write_failed_events(&remaining);
        (failed.len() as u32, succeeded)
    }

    /// 연결 상태 확인
    pub async fn check_connection(&self) -> bool {
        let url = format!("{}/rest/v1/cli_events?select=id&limit=1", self.config.url);
        match self
            .client
            .get(&url)
            .header("apikey", &self.config.anon_key)
            .header("Authorization", format!("Bearer {}", self.config.anon_key))
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    // --- 로컬 실패 이벤트 관리 ---

    fn failed_events_path(&self) -> PathBuf {
        self.project_path
            .join(".orchestrator")
            .join("failed_events.json")
    }

    fn load_failed_events(&self) -> Vec<FailedEvent> {
        let path = self.failed_events_path();
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Vec::new(),
        }
    }

    fn save_failed_event(&self, event: FailedEvent) {
        let dir = self.project_path.join(".orchestrator");
        let _ = fs::create_dir_all(&dir);
        let mut events = self.load_failed_events();
        events.push(event);
        self.write_failed_events(&events);
    }

    fn write_failed_events(&self, events: &[FailedEvent]) {
        let dir = self.project_path.join(".orchestrator");
        let _ = fs::create_dir_all(&dir);
        if let Ok(json) = serde_json::to_string_pretty(events) {
            let _ = fs::write(self.failed_events_path(), json);
        }
    }
}

/// .env 파일에서 Supabase 설정 로드
/// 우선순위: .env.local → .env
pub fn load_supabase_config(project_path: &Path) -> Option<SupabaseConfig> {
    let search_paths = [
        project_path.join(".env.local"),
        project_path.join(".env"),
    ];

    for env_path in &search_paths {
        if let Ok(content) = fs::read_to_string(env_path) {
            let vars = parse_env(&content);
            let url = vars
                .get("ORCHX_SUPABASE_URL")
                .or_else(|| vars.get("VITE_SUPABASE_URL"));
            let key = vars
                .get("ORCHX_SUPABASE_ANON_KEY")
                .or_else(|| vars.get("VITE_SUPABASE_ANON_KEY"));

            if let (Some(url), Some(key)) = (url, key) {
                return Some(SupabaseConfig {
                    url: url.clone(),
                    anon_key: key.clone(),
                });
            }
        }
    }

    None
}

/// .env 파일 파싱
fn parse_env(content: &str) -> HashMap<String, String> {
    let mut vars = HashMap::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            let key = key.trim();
            let value = value.trim().trim_matches('"').trim_matches('\'');
            vars.insert(key.to_string(), value.to_string());
        }
    }
    vars
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_env() {
        let content = r#"
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY="my-key-123"
# 주석
SOME_OTHER=value
"#;
        let vars = parse_env(content);
        assert_eq!(
            vars.get("VITE_SUPABASE_URL").unwrap(),
            "https://example.supabase.co"
        );
        assert_eq!(vars.get("VITE_SUPABASE_ANON_KEY").unwrap(), "my-key-123");
        assert_eq!(vars.get("SOME_OTHER").unwrap(), "value");
    }

    #[test]
    fn test_parse_env_single_quotes() {
        let content = "ORCHX_SUPABASE_URL='https://test.supabase.co'\n";
        let vars = parse_env(content);
        assert_eq!(
            vars.get("ORCHX_SUPABASE_URL").unwrap(),
            "https://test.supabase.co"
        );
    }
}
