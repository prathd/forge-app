use crate::api::models::CreateSessionResponse;
use crate::core::claude::QueryOptions;
use crate::core::error::{ErrorResponse, Result};
use crate::infrastructure::state::AppState;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tracing::{debug, error, info};

#[tauri::command]
pub async fn create_session(
    agent_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<CreateSessionResponse> {
    let state = state.lock().await;
    match state.claude_manager.create_session(&agent_id).await {
        Ok(session_id) => Ok(CreateSessionResponse { session_id }),
        Err(e) => Err(ErrorResponse::new(e.to_string())),
    }
}

#[tauri::command]
pub async fn send_message(
    session_id: String,
    prompt: String,
    options: Option<QueryOptions>,
    window: tauri::Window,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<()> {
    info!("send_message called - session_id: {}, prompt_length: {}", session_id, prompt.len());
    debug!("Prompt: {}", prompt);
    
    let state = state.lock().await;
    let (tx, mut rx) = mpsc::channel(100);

    // Clone values for the spawned task
    let session_id_clone = session_id.clone();
    let window_clone = window.clone();
    let claude_manager = state.claude_manager.clone();

    // Spawn task to handle the query
    tokio::spawn(async move {
        if let Err(e) = claude_manager
            .query(&session_id_clone, &prompt, options, tx)
            .await
        {
            let _ = window_clone.emit("claude-error", ErrorResponse::new(e.to_string()));
        }
    });

    // Spawn task to handle message forwarding
    tokio::spawn(async move {
        info!("Started message forwarding task");
        let mut forwarded_count = 0;
        
        while let Some(message) = rx.recv().await {
            forwarded_count += 1;
            debug!("Forwarding message #{} to frontend: role={}, content_length={}", 
                forwarded_count, message.role, message.content.len());
            
            match window.emit("claude-message", &message) {
                Ok(_) => debug!("Message forwarded successfully"),
                Err(e) => error!("Failed to emit message to frontend: {}", e),
            }
        }
        
        info!("Message forwarding task completed after {} messages", forwarded_count);
    });

    Ok(())
}

#[tauri::command]
pub async fn abort_session(
    session_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<()> {
    let state = state.lock().await;
    state.claude_manager.abort_session(&session_id).await
        .map_err(|e| ErrorResponse::new(e.to_string()))
}

#[tauri::command]
pub async fn clear_session(
    session_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<()> {
    let state = state.lock().await;
    state.claude_manager.clear_session(&session_id).await
        .map_err(|e| ErrorResponse::new(e.to_string()))
}