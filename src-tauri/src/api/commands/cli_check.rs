use crate::api::models::ClaudeCliStatus;
use crate::core::error::{ErrorResponse, Result};
use std::env;
use std::path::Path;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[tauri::command]
pub async fn check_claude_cli() -> Result<bool> {
    // Check if claude command exists and is executable with a 30 second timeout
    let check_future = async {
        Command::new("claude")
            .arg("--version")
            .output()
            .await
    };
    
    match timeout(Duration::from_secs(30), check_future).await {
        Ok(Ok(output)) => {
            // Check if the command executed successfully
            if output.status.success() {
                Ok(true)
            } else {
                // Command exists but returned an error
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(ErrorResponse::new(format!("Claude CLI returned an error: {}", stderr)))
            }
        }
        Ok(Err(_)) => {
            // Command not found or not executable
            Ok(false)
        }
        Err(_) => {
            // Timeout occurred
            Err(ErrorResponse::new("Claude CLI check timed out after 30 seconds"))
        }
    }
}

#[tauri::command]
pub async fn get_claude_cli_status() -> Result<ClaudeCliStatus> {
    let mut status = ClaudeCliStatus {
        installed: false,
        version: None,
        authenticated: false,
        error: None,
    };
    
    // Check if claude command exists and get version with timeout
    let version_future = async {
        Command::new("claude")
            .arg("--version")
            .output()
            .await
    };
    
    match timeout(Duration::from_secs(30), version_future).await {
        Ok(Ok(output)) => {
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
                
                // Skip auth check for now - it's too slow
                // We'll check authentication lazily when actually using the CLI
                status.authenticated = true; // Assume authenticated, will fail later if not
            } else {
                status.error = Some("Claude CLI returned an error".to_string());
            }
        }
        Ok(Err(_)) => {
            status.error = Some("Claude CLI is not installed. Please install it from https://claude.ai/cli".to_string());
        }
        Err(_) => {
            status.error = Some("Claude CLI check timed out. Please ensure Claude CLI is properly installed.".to_string());
        }
    }
    
    Ok(status)
}

#[tauri::command]
pub async fn quick_claude_check() -> Result<bool> {
    // Check common CLI locations
    let possible_paths = vec![
        "/usr/local/bin/claude",
        "/usr/bin/claude",
        "/opt/homebrew/bin/claude",
        "~/.local/bin/claude",
    ];
    
    // Also check PATH environment variable
    if let Ok(path_var) = env::var("PATH") {
        for path_dir in path_var.split(':') {
            let claude_path = Path::new(path_dir).join("claude");
            if claude_path.exists() {
                return Ok(true);
            }
        }
    }
    
    // Check predefined paths
    for path_str in possible_paths {
        let path = if path_str.starts_with("~") {
            if let Ok(home) = env::var("HOME") {
                Path::new(&home).join(&path_str[2..])
            } else {
                continue;
            }
        } else {
            Path::new(path_str).to_path_buf()
        };
        
        if path.exists() {
            return Ok(true);
        }
    }
    
    Ok(false)
}

#[tauri::command]
pub async fn check_claude_auth() -> Result<bool> {
    // Try a simpler command that should be faster
    let auth_future = async {
        Command::new("claude")
            .arg("auth")
            .arg("status")
            .output()
            .await
    };
    
    match timeout(Duration::from_secs(5), auth_future).await {
        Ok(Ok(output)) => {
            // Check if authenticated based on output
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            
            if output.status.success() || stdout.contains("authenticated") {
                Ok(true)
            } else if stderr.contains("not authenticated") || stderr.contains("API key") {
                Ok(false)
            } else {
                // If we can't determine, assume not authenticated
                Ok(false)
            }
        }
        Ok(Err(_)) => {
            Ok(false)
        }
        Err(_) => {
            Err(ErrorResponse::new("Authentication check timed out"))
        }
    }
}