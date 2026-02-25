mod oauth;
mod session;
mod contract;
mod watcher;
mod sync_client;
mod offline_tracker;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

/// 앱 전역 상태: 멀티 프로젝트 감시
struct AppState {
    /// repo_full_name → WatcherState 매핑
    watchers: Mutex<HashMap<String, watcher::WatcherState>>,
    /// repo_full_name → 로컬 경로 매핑
    project_paths: Mutex<HashMap<String, PathBuf>>,
    /// 전체 감시 활성화 여부
    watching_enabled: Mutex<bool>,
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

    // 경로 저장
    {
        let mut paths = state.project_paths.lock().map_err(|e| e.to_string())?;
        paths.insert(repo_full_name.clone(), project_path.clone());
    }

    // 감시 활성화 상태면 watcher 시작
    if enabled {
        let watcher_state = watcher::start_watcher(project_path, app.clone())?;
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

    // 경로 제거
    {
        let mut paths = state.project_paths.lock().map_err(|e| e.to_string())?;
        paths.remove(&repo_full_name);
    }

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
            match watcher::start_watcher(path.clone(), app.clone()) {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            watchers: Mutex::new(HashMap::new()),
            project_paths: Mutex::new(HashMap::new()),
            watching_enabled: Mutex::new(true), // 기본값: 감시 ON
        })
        .invoke_handler(tauri::generate_handler![
            start_oauth_server,
            add_watch_project,
            remove_watch_project,
            toggle_watch_all,
            get_watch_status,
            get_offline_changes,
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
                                        log::info!("⏸ {} 감시 중지", name);
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
                                            match watcher::start_watcher(path.clone(), app.clone()) {
                                                Ok(ws) => {
                                                    watchers.insert(name.clone(), ws);
                                                    log::info!("👁 {} 감시 시작", name);
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
