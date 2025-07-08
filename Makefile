# Forge App Makefile
# Development commands with various logging configurations

.PHONY: help dev dev-debug dev-trace dev-quiet dev-prod build test lint check clean

# Default target - show help
help:
	@echo "Forge App Development Commands"
	@echo "=============================="
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev          - Run development server (default info logging)"
	@echo "  make dev-debug    - Run with debug logging for forge_app"
	@echo "  make dev-trace    - Run with trace logging (very verbose)"
	@echo "  make dev-quiet    - Run with minimal logging (warn/error only)"
	@echo "  make dev-prod     - Run with production-like logging"
	@echo ""
	@echo "Logging Examples:"
	@echo "  make dev-claude   - Debug Claude CLI interactions"
	@echo "  make dev-git      - Debug Git operations"
	@echo "  make dev-session  - Debug session management"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build        - Build for production"
	@echo "  make build-debug  - Build with debug symbols"
	@echo ""
	@echo "Quality Commands:"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run linters (clippy + eslint)"
	@echo "  make check        - Fast Rust type checking"
	@echo "  make typecheck    - TypeScript type checking"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make install      - Install dependencies"

# Development with default logging (info level)
dev:
	@echo "Starting development server with default logging..."
	@echo "Log level: INFO"
	pnpm tauri dev

# Development with debug logging for our app
dev-debug:
	@echo "Starting development server with debug logging..."
	@echo "Log level: DEBUG for forge_app, WARN for dependencies"
	RUST_LOG=forge_app=debug,forge_app_lib=debug,tokio=warn,hyper=warn pnpm tauri dev

# Development with trace logging (very verbose)
dev-trace:
	@echo "Starting development server with trace logging..."
	@echo "⚠️  Warning: This will produce A LOT of output!"
	RUST_LOG=forge_app=trace,forge_app_lib=trace pnpm tauri dev

# Development with minimal logging
dev-quiet:
	@echo "Starting development server with minimal logging..."
	@echo "Log level: WARN and ERROR only"
	RUST_LOG=warn pnpm tauri dev

# Development with production-like logging
dev-prod:
	@echo "Starting development server with production logging..."
	@echo "Log level: INFO for app, WARN for dependencies"
	RUST_LOG=forge_app=info,forge_app_lib=info,tokio=warn,hyper=warn,tauri=warn pnpm tauri dev

# Specific module debugging
dev-claude:
	@echo "Starting with Claude module debugging..."
	@echo "Log level: TRACE for Claude operations"
	RUST_LOG=forge_app::core::claude=trace,forge_app_lib::core::claude=trace,forge_app=info pnpm tauri dev

dev-git:
	@echo "Starting with Git module debugging..."
	@echo "Log level: TRACE for Git operations"
	RUST_LOG=forge_app::core::git=trace,forge_app_lib::core::git=trace,forge_app=info pnpm tauri dev

dev-session:
	@echo "Starting with session debugging..."
	@echo "Log level: TRACE for session management"
	RUST_LOG=forge_app::api::commands::session=trace,forge_app_lib::api::commands::session=trace,forge_app::core::session=trace,forge_app_lib::core::session=trace,forge_app=info pnpm tauri dev

# Build for production
build:
	@echo "Building for production..."
	RUST_LOG=info pnpm tauri build

# Build with debug symbols
build-debug:
	@echo "Building with debug symbols..."
	pnpm tauri build --debug

# Run tests
test:
	@echo "Running tests..."
	cd src-tauri && cargo test
	pnpm test

# Run Rust linting
lint-rust:
	@echo "Running Rust linter (clippy)..."
	cd src-tauri && cargo clippy -- -D warnings

# Run TypeScript/JavaScript linting
lint-ts:
	@echo "Running TypeScript/JavaScript linter..."
	pnpm lint

# Run all linters
lint: lint-rust lint-ts

# Fast Rust type checking
check:
	@echo "Running Rust type check..."
	cd src-tauri && cargo check

# TypeScript type checking
typecheck:
	@echo "Running TypeScript type check..."
	pnpm typecheck

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cd src-tauri && cargo clean
	rm -rf .next
	rm -rf node_modules/.cache

# Install dependencies
install:
	@echo "Installing dependencies..."
	pnpm install
	cd src-tauri && cargo fetch

# Development with custom RUST_LOG (usage: make dev-custom RUST_LOG=debug)
dev-custom:
	@echo "Starting development server with custom RUST_LOG..."
	@echo "RUST_LOG=$(RUST_LOG)"
	pnpm tauri dev