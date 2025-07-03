use crate::claude_simple::{ClaudeManager, QueryOptions};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, State};
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCliStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub authenticated: bool,
    pub error: Option<String>,
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
    use std::process::Command;
    
    // Check if claude command exists and is executable
    match Command::new("claude")
        .arg("--version")
        .output()
    {
        Ok(output) => {
            // Check if the command executed successfully
            if output.status.success() {
                Ok(true)
            } else {
                // Command exists but returned an error
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(ErrorResponse {
                    error: format!("Claude CLI returned an error: {}", stderr),
                })
            }
        }
        Err(_) => {
            // Command not found or not executable
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn get_claude_cli_status() -> Result<ClaudeCliStatus, ErrorResponse> {
    use std::process::Command;
    
    let mut status = ClaudeCliStatus {
        installed: false,
        version: None,
        authenticated: false,
        error: None,
    };
    
    // Check if claude command exists and get version
    match Command::new("claude")
        .arg("--version")
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                status.installed = true;
                let version_output = String::from_utf8_lossy(&output.stdout);
                // Extract version from output (format: "claude version X.X.X")
                if let Some(version_line) = version_output.lines().next() {
                    if let Some(version) = version_line.strip_prefix("claude version ") {
                        status.version = Some(version.trim().to_string());
                    } else {
                        status.version = Some(version_line.trim().to_string());
                    }
                }
                
                // Check authentication status by running a simple command
                match Command::new("claude")
                    .arg("api")
                    .arg("models")
                    .output()
                {
                    Ok(auth_output) => {
                        status.authenticated = auth_output.status.success();
                        if !auth_output.status.success() {
                            let stderr = String::from_utf8_lossy(&auth_output.stderr);
                            if stderr.contains("not authenticated") || stderr.contains("API key") {
                                status.error = Some("Claude CLI is not authenticated. Please run 'claude auth' to authenticate.".to_string());
                            }
                        }
                    }
                    Err(_) => {
                        status.authenticated = false;
                    }
                }
            } else {
                status.error = Some("Claude CLI returned an error".to_string());
            }
        }
        Err(_) => {
            status.error = Some("Claude CLI is not installed. Please install it from https://claude.ai/cli".to_string());
        }
    }
    
    Ok(status)
}