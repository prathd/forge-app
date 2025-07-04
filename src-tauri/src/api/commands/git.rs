use crate::core::git::{
    check_status, checkout_branch, create_branch, stash_changes,
    GitCheckoutOptions, GitStatus,
};

#[tauri::command]
pub async fn check_git_status(directory: String) -> Result<GitStatus, String> {
    check_status(&directory).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_checkout_branch(
    directory: String,
    branch: String,
    options: Option<GitCheckoutOptions>,
) -> Result<(), String> {
    checkout_branch(&directory, &branch, options).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_create_branch(
    directory: String,
    branch_name: String,
    checkout: bool,
) -> Result<(), String> {
    create_branch(&directory, &branch_name, checkout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_stash_changes(directory: String, message: Option<String>) -> Result<(), String> {
    stash_changes(&directory, message).map_err(|e| e.to_string())
}