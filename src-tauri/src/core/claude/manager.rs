use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::Mutex;
use uuid::Uuid;
use tokio::sync::mpsc;

use super::cli_process::{ClaudeCliMessage, ClaudeCliOptions, ClaudeCliProcess};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub role: String,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub agent_type: String,
    pub system_prompt: Option<String>,
    pub working_directory: Option<String>,
    pub branch: Option<String>,
    pub model: Option<String>,
    pub max_tokens: Option<i32>,
    pub temperature: Option<f32>,
    pub max_turns: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryOptions {
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
    pub max_thinking_tokens: Option<i32>,
    pub max_turns: Option<i32>,
    pub model: Option<String>,
    pub fallback_model: Option<String>,
    pub cwd: Option<String>,
    pub custom_system_prompt: Option<String>,
    pub append_system_prompt: Option<String>,
    pub permission_mode: Option<String>,
}

pub struct ClaudeSession {
    pub id: String,
    pub messages: Vec<Message>,
    pub cli_session_id: Option<String>,
    pub process: Option<ClaudeCliProcess>,
}

pub struct ClaudeManager {
    sessions: Arc<Mutex<HashMap<String, ClaudeSession>>>,
}

impl ClaudeManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_session(&self, agent_id: &str) -> Result<String> {
        let session_id = format!("{}-{}", agent_id, Uuid::new_v4());
        
        let session = ClaudeSession {
            id: session_id.clone(),
            messages: Vec::new(),
            cli_session_id: None,
            process: None,
        };

        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    pub async fn query(
        &self,
        session_id: &str,
        prompt: &str,
        options: Option<QueryOptions>,
        tx: tokio::sync::mpsc::Sender<Message>,
    ) -> Result<()> {
        // Convert QueryOptions to ClaudeCliOptions
        let cli_options = if let Some(opts) = options {
            ClaudeCliOptions {
                model: opts.model,
                allowed_tools: opts.allowed_tools,
                disallowed_tools: opts.disallowed_tools,
                working_directory: opts.cwd,
            }
        } else {
            ClaudeCliOptions::default()
        };

        // Get session and CLI session ID
        let cli_session_id = {
            let sessions = self.sessions.lock().await;
            let session = sessions
                .get(session_id)
                .ok_or_else(|| anyhow!("Session not found"))?;
            session.cli_session_id.clone()
        };

        // Add user message
        let user_message = Message {
            role: "user".to_string(),
            content: prompt.to_string(),
            timestamp: Utc::now(),
            session_id: session_id.to_string(),
        };
        
        {
            let mut sessions = self.sessions.lock().await;
            if let Some(session) = sessions.get_mut(session_id) {
                session.messages.push(user_message.clone());
            }
        }
        
        let _ = tx.send(user_message).await;

        // Create channel for CLI messages
        let (cli_tx, mut cli_rx) = mpsc::channel(100);
        
        // Spawn Claude CLI process
        let process = ClaudeCliProcess::spawn(
            prompt,
            cli_session_id.as_deref(),
            &cli_options,
            cli_tx,
        ).await?;

        // Store process in session
        {
            let mut sessions = self.sessions.lock().await;
            if let Some(session) = sessions.get_mut(session_id) {
                session.process = Some(process);
            }
        }

        // Process messages from CLI
        let session_id_clone = session_id.to_string();
        let tx_clone = tx.clone();
        let sessions_clone = self.sessions.clone();
        
        tokio::spawn(async move {
            let mut assistant_content = String::new();
            let mut _cli_session_id: Option<String> = None;
            let mut is_first_assistant_message = true;
            
            while let Some(cli_msg) = cli_rx.recv().await {
                match cli_msg {
                    ClaudeCliMessage::System { session_id: sid, .. } => {
                        if let Some(sid) = sid {
                            _cli_session_id = Some(sid.clone());
                            // Update session with CLI session ID
                            let mut sessions = sessions_clone.lock().await;
                            if let Some(session) = sessions.get_mut(&session_id_clone) {
                                session.cli_session_id = Some(sid);
                            }
                        }
                        
                        // Send initial processing message
                        let processing_msg = Message {
                            role: "system".to_string(),
                            content: "Processing...".to_string(),
                            timestamp: Utc::now(),
                            session_id: session_id_clone.clone(),
                        };
                        let _ = tx_clone.send(processing_msg).await;
                    }
                    ClaudeCliMessage::Assistant { message, .. } => {
                        // Extract and stream text content immediately
                        for content in &message.content {
                            match content {
                                super::cli_process::ContentBlock::Text { text } => {
                                    if !text.is_empty() {
                                        assistant_content.push_str(text);
                                        
                                        // Send streaming message
                                        let stream_msg = Message {
                                            role: if is_first_assistant_message { 
                                                is_first_assistant_message = false;
                                                "assistant".to_string()
                                            } else {
                                                "assistant_stream".to_string()
                                            },
                                            content: text.clone(),
                                            timestamp: Utc::now(),
                                            session_id: session_id_clone.clone(),
                                        };
                                        let _ = tx_clone.send(stream_msg).await;
                                    }
                                }
                            }
                        }
                    }
                    ClaudeCliMessage::Result { is_error, error, .. } => {
                        if is_error {
                            let error_msg = Message {
                                role: "system".to_string(),
                                content: format!("Error: {}", error.unwrap_or_else(|| "Unknown error".to_string())),
                                timestamp: Utc::now(),
                                session_id: session_id_clone.clone(),
                            };
                            let _ = tx_clone.send(error_msg).await;
                        } else {
                            // Store the complete assistant message in session
                            if !assistant_content.is_empty() {
                                let assistant_msg = Message {
                                    role: "assistant".to_string(),
                                    content: assistant_content.clone(),
                                    timestamp: Utc::now(),
                                    session_id: session_id_clone.clone(),
                                };
                                
                                // Store complete message in session
                                let mut sessions = sessions_clone.lock().await;
                                if let Some(session) = sessions.get_mut(&session_id_clone) {
                                    session.messages.push(assistant_msg);
                                }
                            }
                            
                            // Send completion message
                            let complete_msg = Message {
                                role: "system".to_string(),
                                content: "Completed successfully".to_string(),
                                timestamp: Utc::now(),
                                session_id: session_id_clone.clone(),
                            };
                            let _ = tx_clone.send(complete_msg).await;
                        }
                        
                        // Clear process from session
                        let mut sessions = sessions_clone.lock().await;
                        if let Some(session) = sessions.get_mut(&session_id_clone) {
                            if let Some(process) = session.process.take() {
                                let _ = process.wait().await;
                            }
                        }
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub async fn abort_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        if let Some(mut session) = sessions.remove(session_id) {
            // Abort the CLI process if running
            if let Some(process) = session.process.take() {
                process.abort().await?;
            }
        }
        Ok(())
    }

    pub async fn clear_session(&self, session_id: &str) -> Result<()> {
        self.abort_session(session_id).await
    }
}