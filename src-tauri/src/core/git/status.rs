use anyhow::Result;
use std::path::Path;
use std::process::Command;
use tracing::{debug, info};

use super::types::GitStatus;

pub fn check_status(directory: &str) -> Result<GitStatus> {
    let path = Path::new(directory);
    
    // Check if directory exists
    if !path.exists() {
        debug!("Directory {} does not exist", directory);
        return Ok(GitStatus {
            is_repo: false,
            current_branch: None,
            has_unstaged_changes: false,
            has_staged_changes: false,
            branches: vec![],
        });
    }

    // Check if it's a git repository
    let is_repo_output = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(directory)
        .output()?;

    if !is_repo_output.status.success() {
        debug!("Directory {} is not a git repository", directory);
        return Ok(GitStatus {
            is_repo: false,
            current_branch: None,
            has_unstaged_changes: false,
            has_staged_changes: false,
            branches: vec![],
        });
    }

    info!("Checking git status for repository: {}", directory);

    // Get current branch
    let current_branch = get_current_branch(directory)?;
    
    // Check for changes
    let (has_unstaged_changes, has_staged_changes) = check_for_changes(directory)?;
    
    // Get all branches
    let branches = get_all_branches(directory)?;

    Ok(GitStatus {
        is_repo: true,
        current_branch,
        has_unstaged_changes,
        has_staged_changes,
        branches,
    })
}

fn get_current_branch(directory: &str) -> Result<Option<String>> {
    let output = Command::new("git")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .current_dir(directory)
        .output()?;

    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        debug!("Current branch: {}", branch);
        Ok(Some(branch))
    } else {
        debug!("Failed to get current branch");
        Ok(None)
    }
}

fn check_for_changes(directory: &str) -> Result<(bool, bool)> {
    // Check for unstaged changes
    let unstaged_output = Command::new("git")
        .arg("diff")
        .arg("--quiet")
        .current_dir(directory)
        .output()?;

    let has_unstaged_changes = !unstaged_output.status.success();

    // Check for staged changes
    let staged_output = Command::new("git")
        .arg("diff")
        .arg("--cached")
        .arg("--quiet")
        .current_dir(directory)
        .output()?;

    let has_staged_changes = !staged_output.status.success();

    debug!(
        "Changes - unstaged: {}, staged: {}",
        has_unstaged_changes, has_staged_changes
    );

    Ok((has_unstaged_changes, has_staged_changes))
}

fn get_all_branches(directory: &str) -> Result<Vec<String>> {
    let output = Command::new("git")
        .arg("branch")
        .arg("-a")
        .arg("--format=%(refname:short)")
        .current_dir(directory)
        .output()?;

    if output.status.success() {
        let branches: Vec<String> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && !s.starts_with("origin/"))
            .collect();
        
        debug!("Found {} branches", branches.len());
        Ok(branches)
    } else {
        debug!("Failed to get branches");
        Ok(vec![])
    }
}