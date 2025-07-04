mod api;
mod core;
mod infrastructure;

use api::commands::{
    abort_session, check_claude_auth, check_claude_cli, clear_session, create_session,
    get_claude_cli_status, greet, quick_claude_check, send_message,
};
use infrastructure::state::AppState;
use std::sync::Arc;
use tokio::sync::Mutex;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing/logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();
    
    tracing::info!("Starting Forge application");
    
    let app_state = Arc::new(Mutex::new(AppState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            create_session,
            send_message,
            abort_session,
            clear_session,
            check_claude_cli,
            check_claude_auth,
            get_claude_cli_status,
            quick_claude_check
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}