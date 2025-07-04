use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::Mutex;
use uuid::Uuid;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use super::cli_process::{ClaudeCliMessage, ClaudeCliOptions, ClaudeCliProcess};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct UserMessage {
    role: String,
    content: serde_json::Value,
}

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

        // User message will be handled by the frontend, no need to send it from here

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
            let mut total_tokens: Option<(u32, u32)> = None;
            let mut last_message_id: Option<String> = None;
            let mut last_content_length = 0;
            
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
                        // Don't send a processing message here - the UI already shows loading state
                    }
                    ClaudeCliMessage::Assistant { message, .. } => {
                        // Track token usage if available
                        if let Some(usage) = &message.usage {
                            total_tokens = Some((usage.input_tokens, usage.output_tokens));
                        }
                        
                        // Check if this is an update to the same message
                        let is_same_message = last_message_id.as_ref() == Some(&message.id);
                        if !is_same_message {
                            last_message_id = Some(message.id.clone());
                            last_content_length = 0;
                            assistant_content.clear();
                        }
                        
                        // Extract and stream content immediately
                        for content in &message.content {
                            use super::cli_process::ContentBlock;
                            match content {
                                ContentBlock::Text { text } => {
                                    if !text.is_empty() {
                                        // Only send new content if this is a new message or new content
                                        let new_content_start = assistant_content.len();
                                        assistant_content.push_str(text);
                                        
                                        if new_content_start >= last_content_length {
                                            let new_text = &assistant_content[new_content_start..];
                                            if !new_text.is_empty() {
                                                // Send streaming message
                                                let stream_msg = Message {
                                                    role: if is_first_assistant_message { 
                                                        is_first_assistant_message = false;
                                                        "assistant".to_string()
                                                    } else {
                                                        "assistant_stream".to_string()
                                                    },
                                                    content: new_text.to_string(),
                                                    timestamp: Utc::now(),
                                                    session_id: session_id_clone.clone(),
                                                };
                                                let _ = tx_clone.send(stream_msg).await;
                                                last_content_length = assistant_content.len();
                                            }
                                        }
                                    }
                                }
                                ContentBlock::ToolUse { name, input: _, id } => {
                                    let tool_msg = format!("🔧 Using tool: {} ({})", name, id);
                                    assistant_content.push_str(&format!("\n{}\n", tool_msg));
                                    
                                    let tool_msg = Message {
                                        role: "system".to_string(),
                                        content: tool_msg,
                                        timestamp: Utc::now(),
                                        session_id: session_id_clone.clone(),
                                    };
                                    let _ = tx_clone.send(tool_msg).await;
                                }
                                ContentBlock::Thinking { text } => {
                                    // Optionally show thinking process
                                    let thinking_msg = format!("💭 Thinking: {}", text);
                                    let msg = Message {
                                        role: "system".to_string(),
                                        content: thinking_msg,
                                        timestamp: Utc::now(),
                                        session_id: session_id_clone.clone(),
                                    };
                                    let _ = tx_clone.send(msg).await;
                                }
                                ContentBlock::Image { .. } => {
                                    let img_msg = "📷 [Image content]".to_string();
                                    assistant_content.push_str(&format!("\n{}\n", img_msg));
                                    
                                    let msg = Message {
                                        role: "system".to_string(),
                                        content: img_msg,
                                        timestamp: Utc::now(),
                                        session_id: session_id_clone.clone(),
                                    };
                                    let _ = tx_clone.send(msg).await;
                                }
                                ContentBlock::ServerToolUse { name, .. } |
                                ContentBlock::McpToolUse { name, .. } => {
                                    let tool_msg = format!("🔧 Using {}: {}", 
                                        if matches!(content, ContentBlock::ServerToolUse { .. }) { "server tool" } else { "MCP tool" },
                                        name
                                    );
                                    assistant_content.push_str(&format!("\n{}\n", tool_msg));
                                    
                                    let msg = Message {
                                        role: "system".to_string(),
                                        content: tool_msg,
                                        timestamp: Utc::now(),
                                        session_id: session_id_clone.clone(),
                                    };
                                    let _ = tx_clone.send(msg).await;
                                }
                                _ => {
                                    // Handle other content types generically
                                    let msg = format!("[{:?} content]", content);
                                    assistant_content.push_str(&format!("\n{}\n", msg));
                                }
                            }
                        }
                    }
                    ClaudeCliMessage::User { message, .. } => {
                        // Parse user messages which contain tool results
                        if let Ok(user_msg) = serde_json::from_value::<UserMessage>(message.clone()) {
                            if let Some(content_array) = user_msg.content.as_array() {
                                for content_val in content_array {
                                    if let Ok(content) = serde_json::from_value::<super::cli_process::ContentBlock>(content_val.clone()) {
                                        use super::cli_process::ContentBlock;
                                        match content {
                                            ContentBlock::ToolResult { tool_use_id, content, is_error } => {
                                                let result_msg = if is_error {
                                                    format!("❌ Tool result ({}): {}", tool_use_id, content.as_deref().unwrap_or("Error"))
                                                } else {
                                                    format!("✅ Tool result ({}): {}", tool_use_id, content.as_deref().unwrap_or("Success"))
                                                };
                                                
                                                let msg = Message {
                                                    role: "system".to_string(),
                                                    content: result_msg,
                                                    timestamp: Utc::now(),
                                                    session_id: session_id_clone.clone(),
                                                };
                                                let _ = tx_clone.send(msg).await;
                                            }
                                            ContentBlock::WebSearchToolResult { tool_use_id, .. } => {
                                                let msg = Message {
                                                    role: "system".to_string(),
                                                    content: format!("🔍 Web search result ({})", tool_use_id),
                                                    timestamp: Utc::now(),
                                                    session_id: session_id_clone.clone(),
                                                };
                                                let _ = tx_clone.send(msg).await;
                                            }
                                            ContentBlock::CodeExecutionToolResult { tool_use_id, .. } => {
                                                let msg = Message {
                                                    role: "system".to_string(),
                                                    content: format!("💻 Code execution result ({})", tool_use_id),
                                                    timestamp: Utc::now(),
                                                    session_id: session_id_clone.clone(),
                                                };
                                                let _ = tx_clone.send(msg).await;
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    ClaudeCliMessage::Result { is_error, error, duration_ms, .. } => {
                        if is_error {
                            let error_msg = Message {
                                role: "system".to_string(),
                                content: format!("Error: {}", error.unwrap_or_else(|| "Unknown error".to_string())),
                                timestamp: Utc::now(),
                                session_id: session_id_clone.clone(),
                            };
                            let _ = tx_clone.send(error_msg).await;
                        } else {
                            // Send completion message with token usage if available
                            let completion_content = if let Some((input, output)) = total_tokens {
                                format!("Completed successfully (Tokens: {} in, {} out, {} total)", 
                                    input, output, input + output)
                            } else if let Some(duration) = duration_ms {
                                format!("Completed successfully ({}ms)", duration)
                            } else {
                                "Completed successfully".to_string()
                            };
                            
                            let complete_msg = Message {
                                role: "system".to_string(),
                                content: completion_content,
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
            
            info!("Message processing task completed");
        });

        info!("Query method completed, message processing continues in background");
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