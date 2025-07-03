use crate::claude_simple::{AgentConfig, ClaudeManager, Message, QueryOptions};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use tokio::sync::mpsc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionResponse {
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub error: String,
}

pub struct AppState {
    pub claude_manager: Arc<ClaudeManager>,
}

#[tauri::command]
pub async fn create_session(
    agent_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<CreateSessionResponse, ErrorResponse> {
    let state = state.lock().await;
    match state.claude_manager.create_session(&agent_id).await {
        Ok(session_id) => Ok(CreateSessionResponse { session_id }),
        Err(e) => Err(ErrorResponse {
            error: e.to_string(),
        }),
    }
}

#[tauri::command]
pub async fn send_message(
    session_id: String,
    prompt: String,
    options: Option<QueryOptions>,
    window: tauri::Window,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), ErrorResponse> {
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
            let _ = window_clone.emit("claude-error", ErrorResponse {
                error: e.to_string(),
            });
        }
    });

    // Spawn task to handle message forwarding
    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            let _ = window.emit("claude-message", &message);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn abort_session(
    session_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), ErrorResponse> {
    let state = state.lock().await;
    match state.claude_manager.abort_session(&session_id).await {
        Ok(_) => Ok(()),
        Err(e) => Err(ErrorResponse {
            error: e.to_string(),
        }),
    }
}

#[tauri::command]
pub async fn clear_session(
    session_id: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), ErrorResponse> {
    let state = state.lock().await;
    match state.claude_manager.clear_session(&session_id).await {
        Ok(_) => Ok(()),
        Err(e) => Err(ErrorResponse {
            error: e.to_string(),
        }),
    }
}

#[tauri::command]
pub async fn check_claude_cli() -> Result<bool, ErrorResponse> {
    // For now, always return true to allow testing
    // In production, this would check if Claude CLI is actually installed
    Ok(true)
}