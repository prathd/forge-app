mod claude_simple;
mod commands;

use commands::{abort_session, check_claude_cli, clear_session, create_session, send_message, AppState};
use std::sync::Arc;
use tokio::sync::Mutex;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let claude_manager = Arc::new(claude_simple::ClaudeManager::new());
    let app_state = Arc::new(Mutex::new(AppState { claude_manager }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            create_session,
            send_message,
            abort_session,
            clear_session,
            check_claude_cli
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}