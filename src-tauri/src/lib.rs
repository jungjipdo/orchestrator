mod oauth;

use tauri::Manager;

#[tauri::command]
async fn start_oauth_server(app: tauri::AppHandle) -> Result<String, String> {
    let (server, listener) = oauth::OAuthServer::new()
        .await
        .map_err(|e| format!("서버 시작 실패: {}", e))?;

    let callback_url = server.callback_url();

    // 백그라운드에서 콜백 서버 실행 (1회 수신 후 자동 종료)
    tauri::async_runtime::spawn(async move {
        oauth::start_callback_server(listener, app).await;
    });

    Ok(callback_url)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_oauth_server])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
