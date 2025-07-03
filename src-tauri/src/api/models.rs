use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionResponse {
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCliStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub authenticated: bool,
    pub error: Option<String>,
}