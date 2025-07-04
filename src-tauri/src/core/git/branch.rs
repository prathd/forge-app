use anyhow::{anyhow, Result};
use std::process::Command;
use tracing::{error, info};

use super::types::GitCheckoutOptions;

pub fn create(directory: &str, branch_name: &str, checkout: bool) -> Result<()> {
    info!("Creating branch {} in {}", branch_name, directory);

    // Create branch
    let output = Command::new("git")
        .arg("branch")
        .arg(branch_name)
        .current_dir(directory)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Failed to create branch: {}", stderr);
        return Err(anyhow!("Failed to create branch: {}", stderr));
    }

    // Checkout if requested
    if checkout {
        checkout_branch(directory, branch_name)?;
    }

    info!("Successfully created branch {}", branch_name);
    Ok(())
}

pub fn checkout(directory: &str, branch: &str, options: Option<GitCheckoutOptions>) -> Result<()> {
    let opts = options.unwrap_or_default();
    
    info!("Checking out branch {} in {}", branch, directory);

    // Stash changes if requested
    if opts.stash_changes {
        super::stash::stash(directory, Some(format!("Auto-stash before checkout to {}", branch)))?;
        info!("Stashed changes before checkout");
    }

    // Checkout branch
    checkout_branch_with_options(directory, branch, opts.force)?;

    info!("Successfully checked out branch {}", branch);
    Ok(())
}

fn checkout_branch(directory: &str, branch: &str) -> Result<()> {
    checkout_branch_with_options(directory, branch, false)
}

fn checkout_branch_with_options(directory: &str, branch: &str, force: bool) -> Result<()> {
    let mut cmd = Command::new("git");
    cmd.arg("checkout");
    
    if force {
        cmd.arg("-f");
    }
    
    cmd.arg(branch);
    cmd.current_dir(directory);

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Failed to checkout branch: {}", stderr);
        return Err(anyhow!("Failed to checkout branch: {}", stderr));
    }

    Ok(())
}