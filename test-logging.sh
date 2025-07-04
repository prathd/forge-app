#!/bin/bash
cd /Users/prath/wip/forge/forge-app
export RUST_LOG=debug
echo "Starting app with debug logging..."
echo "When you send a message in the app, logs will appear here."
echo "Press Ctrl+C to stop."
echo "---"
# Use tee to both display output and filter it
pnpm tauri:dev 2>&1 | tee >(grep --line-buffered -E "(Starting|INFO|DEBUG|ERROR|WARN|Claude|query|message|Message|spawn|session)" | grep -v "node_modules")