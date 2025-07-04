use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ContentBlock {
    Text { text: String },
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
        let mut cmd = Command::new("claude");
        
        // Always use streaming JSON format for machine-readable output
        cmd.arg("--print")
           .arg("--output-format").arg("stream-json")
           .arg("--verbose");
        
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
        
        // Spawn the process
        let mut child = cmd.spawn()?;
        
        // Take stdout for reading
        let stdout = child.stdout.take()
            .ok_or_else(|| anyhow!("Failed to capture stdout"))?;
        
        // Create abort channel
        let (abort_sender, mut abort_receiver) = oneshot::channel();
        
        // Spawn task to read output
        let output_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            loop {
                tokio::select! {
                    line_result = lines.next_line() => {
                        match line_result {
                            Ok(Some(line)) => {
                                // Parse JSON line
                                match serde_json::from_str::<ClaudeCliMessage>(&line) {
                                    Ok(msg) => {
                                        if message_sender.send(msg).await.is_err() {
                                            break;
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("Failed to parse Claude CLI output: {} - Line: {}", e, line);
                                    }
                                }
                            }
                            Ok(None) => {
                                // EOF reached
                                break;
                            }
                            Err(e) => {
                                eprintln!("Error reading Claude CLI output: {}", e);
                                break;
                            }
                        }
                    }
                    _ = &mut abort_receiver => {
                        // Abort requested
                        break;
                    }
                }
            }
            
            Ok(())
        });
        
        Ok(Self {
            child,
            output_handle,
            abort_sender,
        })
    }
    
    pub async fn abort(mut self) -> Result<()> {
        // Send abort signal
        let _ = self.abort_sender.send(());
        
        // Kill the child process
        self.child.kill().await?;
        
        // Wait for output task to finish
        let _ = self.output_handle.await;
        
        Ok(())
    }
    
    pub async fn wait(mut self) -> Result<()> {
        // Wait for the process to complete
        let status = self.child.wait().await?;
        
        // Wait for output handling to complete
        self.output_handle.await??;
        
        if !status.success() {
            return Err(anyhow!("Claude CLI exited with status: {}", status));
        }
        
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