use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub current_branch: Option<String>,
    pub has_unstaged_changes: bool,
    pub has_staged_changes: bool,
    pub branches: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCheckoutOptions {
    pub stash_changes: bool,
    pub force: bool,
}

impl Default for GitCheckoutOptions {
    fn default() -> Self {
        Self {
            stash_changes: false,
            force: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashOptions {
    pub message: Option<String>,
}