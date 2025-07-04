#!/bin/bash
cd /Users/prath/wip/forge/forge-app

# Kill any existing processes
pkill -f "forge-app"
sleep 1

export RUST_LOG=debug
LOG_FILE="forge-debug.log"

echo "Starting Forge app with debug logging..."
echo "Logs will be saved to: $LOG_FILE"
echo "In another terminal, run: tail -f $LOG_FILE | grep -E '(INFO|ERROR|WARN|Claude|query|message|spawn|session)'"
echo "---"

# Start the app and save logs
pnpm tauri:dev 2>&1 | tee "$LOG_FILE"