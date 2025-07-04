use anyhow::{anyhow, Result};
use std::process::Command;
use tracing::{error, info};

pub fn stash(directory: &str, message: Option<String>) -> Result<()> {
    info!("Stashing changes in {}", directory);

    let mut cmd = Command::new("git");
    cmd.arg("stash").arg("push");

    if let Some(msg) = message {
        cmd.arg("-m").arg(msg);
    }

    cmd.current_dir(directory);

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("Failed to stash changes: {}", stderr);
        return Err(anyhow!("Failed to stash changes: {}", stderr));
    }

    info!("Successfully stashed changes");
    Ok(())
}