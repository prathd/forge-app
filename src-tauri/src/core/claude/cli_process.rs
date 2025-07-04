use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ClaudeCliMessage {
    #[serde(rename = "system")]
    System {
        subtype: String,
        #[serde(default)]
        cwd: Option<String>,
        #[serde(default)]
        session_id: Option<String>,
        #[serde(default)]
        tools: Option<Vec<String>>,
        #[serde(default)]
        model: Option<String>,
    },
    #[serde(rename = "assistant")]
    Assistant {
        message: AssistantMessage,
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "user")]
    User {
        message: serde_json::Value,
        #[serde(default)]
        session_id: Option<String>,
    },
    #[serde(rename = "result")]
    Result {
        subtype: String,
        is_error: bool,
        #[serde(default)]
        result: Option<String>,
        #[serde(default)]
        error: Option<String>,
        #[serde(default)]
        session_id: Option<String>,
        #[serde(default)]
        duration_ms: Option<u64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantMessage {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub role: String,
    pub model: String,
    pub content: Vec<ContentBlock>,
    #[serde(default)]
    pub stop_reason: Option<String>,
    #[serde(default)]
    pub stop_sequence: Option<String>,
    #[serde(default)]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    #[serde(default)]
    pub output_tokens: u32,
    #[serde(default)]
    pub cache_creation_input_tokens: Option<u32>,
    #[serde(default)]
    pub cache_read_input_tokens: Option<u32>,
    #[serde(default)]
    pub service_tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { 
        text: String 
    },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "tool_result")]
    ToolResult {
        tool_use_id: String,
        #[serde(default)]
        content: Option<String>,
        #[serde(default)]
        is_error: bool,
    },
    Image {
        source: ImageSource,
    },
    Thinking {
        text: String,
    },
    #[serde(rename = "server_tool_use")]
    ServerToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "web_search_tool_result")]
    WebSearchToolResult {
        tool_use_id: String,
        content: serde_json::Value,
    },
    #[serde(rename = "code_execution_tool_result")]
    CodeExecutionToolResult {
        tool_use_id: String,
        content: serde_json::Value,
    },
    #[serde(rename = "mcp_tool_use")]
    McpToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "mcp_tool_result")]
    McpToolResult {
        tool_use_id: String,
        content: serde_json::Value,
    },
    #[serde(rename = "container_upload")]
    ContainerUpload {
        container_id: String,
        files: Vec<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSource {
    #[serde(rename = "type")]
    source_type: String,
    media_type: String,
    data: String,
}

pub struct ClaudeCliProcess {
    child: Child,
    output_handle: JoinHandle<Result<()>>,
    abort_sender: oneshot::Sender<()>,
}

impl ClaudeCliProcess {
    pub async fn spawn(
        prompt: &str,
        session_id: Option<&str>,
        options: &ClaudeCliOptions,
        message_sender: mpsc::Sender<ClaudeCliMessage>,
    ) -> Result<Self> {
        info!("Starting Claude CLI process");
        debug!("Prompt: {}", prompt);
        debug!("Session ID: {:?}", session_id);
        debug!("Options: {:?}", options);
        
        let mut cmd = Command::new("claude");
        
        // Always use streaming JSON format for machine-readable output
        // Skip permission checks for seamless tool usage
        cmd.arg("--print")
           .arg("--output-format").arg("stream-json")
           .arg("--verbose")
           .arg("--dangerously-skip-permissions");
        
        // Add session ID if provided
        if let Some(sid) = session_id {
            cmd.arg("--resume").arg(sid);
        }
        
        // Add model if specified
        if let Some(model) = &options.model {
            cmd.arg("--model").arg(model);
        }
        
        // Add allowed tools
        if let Some(allowed) = &options.allowed_tools {
            if !allowed.is_empty() {
                cmd.arg("--allowedTools").arg(allowed.join(","));
            }
        }
        
        // Add disallowed tools
        if let Some(disallowed) = &options.disallowed_tools {
            if !disallowed.is_empty() {
                cmd.arg("--disallowedTools").arg(disallowed.join(","));
            }
        }
        
        // Add working directory
        if let Some(cwd) = &options.working_directory {
            cmd.current_dir(cwd);
        }
        
        // Add the prompt as the last argument
        cmd.arg(prompt);
        
        // Configure process pipes
        cmd.stdin(Stdio::null())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());
        
        // Log the full command
        info!("Executing command: {:?}", cmd);
        
        // Spawn the process
        let mut child = cmd.spawn().map_err(|e| {
            error!("Failed to spawn Claude CLI: {}", e);
            e
        })?;
        
        info!("Claude CLI process spawned with PID: {:?}", child.id());
        
        // Take stdout for reading
        let stdout = child.stdout.take()
            .ok_or_else(|| anyhow!("Failed to capture stdout"))?;
        
        // Take stderr for error logging
        let stderr = child.stderr.take()
            .ok_or_else(|| anyhow!("Failed to capture stderr"))?;
        
        // Spawn task to read stderr
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                error!("Claude CLI stderr: {}", line);
            }
        });
        
        // Create abort channel
        let (abort_sender, mut abort_receiver) = oneshot::channel();
        
        // Spawn task to read output
        let output_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut line_count = 0;
            let mut received_result = false;
            
            info!("Starting to read Claude CLI output");
            
            loop {
                tokio::select! {
                    line_result = lines.next_line() => {
                        match line_result {
                            Ok(Some(line)) => {
                                line_count += 1;
                                debug!("Received line {}: {}", line_count, &line);
                                
                                // Parse JSON line
                                match serde_json::from_str::<ClaudeCliMessage>(&line) {
                                    Ok(msg) => {
                                        let msg_type = match &msg {
                                            ClaudeCliMessage::System { .. } => "system",
                                            ClaudeCliMessage::Assistant { .. } => "assistant",
                                            ClaudeCliMessage::User { .. } => "user",
                                            ClaudeCliMessage::Result { .. } => {
                                                received_result = true;
                                                "result"
                                            }
                                        };
                                        info!("Parsed message type: {:?}", msg_type);
                                        
                                        if message_sender.send(msg).await.is_err() {
                                            error!("Failed to send message through channel - receiver dropped");
                                            break;
                                        }
                                    }
                                    Err(e) => {
                                        error!("Failed to parse Claude CLI output: {} - Line: {}", e, line);
                                    }
                                }
                            }
                            Ok(None) => {
                                info!("EOF reached after {} lines", line_count);
                                
                                // Send a synthetic result message if we haven't received one
                                if !received_result {
                                    warn!("Process ended without sending a result message - sending synthetic result");
                                    let synthetic_result = ClaudeCliMessage::Result {
                                        subtype: "interrupted".to_string(),
                                        is_error: true,
                                        result: None,
                                        error: Some("Process ended without completion message".to_string()),
                                        session_id: None,
                                        duration_ms: None,
                                    };
                                    
                                    if message_sender.send(synthetic_result).await.is_err() {
                                        error!("Failed to send synthetic result message");
                                    }
                                }
                                
                                break;
                            }
                            Err(e) => {
                                error!("Error reading Claude CLI output: {}", e);
                                
                                // Send error result
                                let error_result = ClaudeCliMessage::Result {
                                    subtype: "error".to_string(),
                                    is_error: true,
                                    result: None,
                                    error: Some(format!("Error reading output: {}", e)),
                                    session_id: None,
                                    duration_ms: None,
                                };
                                
                                let _ = message_sender.send(error_result).await;
                                break;
                            }
                        }
                    }
                    _ = &mut abort_receiver => {
                        info!("Abort requested, stopping output reader");
                        break;
                    }
                }
            }
            
            info!("Output reader task completed");
            Ok(())
        });
        
        Ok(Self {
            child,
            output_handle,
            abort_sender,
        })
    }
    
    pub async fn abort(mut self) -> Result<()> {
        info!("Aborting Claude CLI process");
        
        // Send abort signal
        let _ = self.abort_sender.send(());
        
        // Kill the child process
        if let Some(pid) = self.child.id() {
            info!("Killing process with PID: {}", pid);
        }
        self.child.kill().await?;
        
        // Wait for output task to finish
        let _ = self.output_handle.await;
        
        info!("Claude CLI process aborted successfully");
        Ok(())
    }
    
    pub async fn wait(mut self) -> Result<()> {
        info!("Waiting for Claude CLI process to complete");
        
        // Wait for the process to complete
        let status = self.child.wait().await?;
        info!("Claude CLI process exited with status: {}", status);
        
        // Wait for output handling to complete
        self.output_handle.await??;
        
        if !status.success() {
            error!("Claude CLI exited with non-zero status: {}", status);
            return Err(anyhow!("Claude CLI exited with status: {}", status));
        }
        
        info!("Claude CLI process completed successfully");
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct ClaudeCliOptions {
    pub model: Option<String>,
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
    pub working_directory: Option<String>,
}