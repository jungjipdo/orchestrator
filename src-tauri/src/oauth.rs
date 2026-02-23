use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

/// 로컬 콜백 서버 상태
pub struct OAuthServer {
    port: u16,
}

impl OAuthServer {
    /// 사용 가능한 랜덤 포트에 바인딩
    pub async fn new() -> Result<(Self, TcpListener), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind("127.0.0.1:0").await?;
        let port = listener.local_addr()?.port();
        Ok((Self { port }, listener))
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn callback_url(&self) -> String {
        format!("http://127.0.0.1:{}/auth/callback", self.port)
    }
}

/// 단일 요청만 받는 콜백 서버 실행
/// Chrome이 code를 가지고 리디렉트하면 받아서 프론트엔드에 emit
pub async fn start_callback_server(
    listener: TcpListener,
    app_handle: AppHandle,
) {
    // 1회 연결만 수락
    if let Ok((mut stream, _)) = listener.accept().await {
        let mut buf = vec![0u8; 4096];
        if let Ok(n) = stream.read(&mut buf).await {
            let request = String::from_utf8_lossy(&buf[..n]);

            // GET /auth/callback?code=XXXX HTTP/1.1 에서 code 추출
            if let Some(code) = extract_code(&request) {
                // 성공 HTML 응답
                let html = r#"<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                    body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
                    .card{background:white;padding:40px;border-radius:16px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
                    h1{font-size:24px;margin-bottom:12px}p{color:#666}
                </style></head><body><div class="card">
                    <h1>✅ 인증 완료!</h1>
                    <p>Orchestrator 앱으로 돌아가주세요.<br>이 창은 닫으셔도 됩니다.</p>
                </div></body></html>"#;

                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html.len(),
                    html
                );
                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.flush().await;

                // 프론트엔드에 code 전달
                let _ = app_handle.emit("oauth-callback", code);
            } else {
                let body = "Missing code parameter";
                let response = format!(
                    "HTTP/1.1 400 Bad Request\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(response.as_bytes()).await;
            }
        }
    }
}

fn extract_code(request: &str) -> Option<String> {
    // GET /auth/callback?code=XXXX&... HTTP/1.1
    let first_line = request.lines().next()?;
    let path = first_line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;

    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("code=") {
            return Some(value.to_string());
        }
    }
    None
}
