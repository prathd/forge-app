use crate::core::claude::ClaudeManager;
use std::sync::Arc;

pub struct AppState {
    pub claude_manager: Arc<ClaudeManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            claude_manager: Arc::new(ClaudeManager::new()),
        }
    }
}