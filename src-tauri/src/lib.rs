mod oauth;

use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::image::Image;

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
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![start_oauth_server])
        .setup(|app| {
            // ─── 시스템 트레이 ───
            let show_item = MenuItem::with_id(app, "show", "Orchestrator 열기", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let icon = Image::from_path("icons/icon.png")
                .unwrap_or_else(|_| Image::from_bytes(include_bytes!("../icons/icon.png")).expect("icon"));

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
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // ─── 디버그 로그 ───
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
