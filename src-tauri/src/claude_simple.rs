use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::async_runtime::Mutex;
use uuid::Uuid;

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
        };

        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    pub async fn query(
        &self,
        session_id: &str,
        prompt: &str,
        _options: Option<QueryOptions>,
        tx: tokio::sync::mpsc::Sender<Message>,
    ) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| anyhow!("Session not found"))?;

        // Add user message
        let user_message = Message {
            role: "user".to_string(),
            content: prompt.to_string(),
            timestamp: Utc::now(),
            session_id: session_id.to_string(),
        };
        session.messages.push(user_message.clone());
        let _ = tx.send(user_message).await;

        // For now, simulate a response
        // In a real implementation, this would call Claude CLI
        let system_message = Message {
            role: "system".to_string(),
            content: "Processing your request...".to_string(),
            timestamp: Utc::now(),
            session_id: session_id.to_string(),
        };
        let _ = tx.send(system_message).await;

        // Simulate assistant response
        let assistant_message = Message {
            role: "assistant".to_string(),
            content: format!(
                "I received your message: \"{}\". \n\nTo use real Claude functionality, please ensure:\n1. Claude CLI is installed\n2. You're authenticated with `claude auth`\n3. The CLI is in your PATH\n\nThis is a demo response while we work on the full integration.",
                prompt
            ),
            timestamp: Utc::now(),
            session_id: session_id.to_string(),
        };
        session.messages.push(assistant_message.clone());
        let _ = tx.send(assistant_message).await;

        // Send completion
        let complete_message = Message {
            role: "system".to_string(),
            content: "Completed successfully".to_string(),
            timestamp: Utc::now(),
            session_id: session_id.to_string(),
        };
        let _ = tx.send(complete_message).await;

        Ok(())
    }

    pub async fn abort_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        sessions.remove(session_id);
        Ok(())
    }

    pub async fn clear_session(&self, session_id: &str) -> Result<()> {
        self.abort_session(session_id).await
    }
}