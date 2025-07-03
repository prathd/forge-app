# Forge Backend Architecture

This Rust backend follows a clean, modular architecture with clear separation of concerns.

## Directory Structure

```
src/
├── api/                    # External API layer
│   ├── commands/          # Tauri command handlers
│   │   ├── cli_check.rs  # Claude CLI verification commands
│   │   ├── greet.rs      # Simple test command
│   │   └── session.rs    # Session management commands
│   └── models.rs         # API request/response models
│
├── core/                  # Core business logic
│   ├── claude/           # Claude integration
│   │   └── manager.rs   # Claude session management
│   └── error.rs         # Error handling types
│
├── infrastructure/       # Infrastructure concerns
│   └── state.rs        # Application state management
│
├── lib.rs              # Library entry point
└── main.rs             # Application entry point
```

## Architecture Principles

### Single Responsibility Principle (SRP)
Each module has a single, well-defined purpose:
- `api/commands/` - Handle external API requests
- `core/claude/` - Manage Claude CLI interactions
- `core/error.rs` - Centralized error handling
- `infrastructure/state.rs` - Application state management

### Dependency Direction
Dependencies flow inward:
- `api` depends on `core` and `infrastructure`
- `core` has no dependencies on other layers
- `infrastructure` depends on `core`

### Module Organization
- Each module has a `mod.rs` that re-exports its public interface
- Implementation details are kept private within modules
- Clear separation between API contracts and business logic

## Key Components

### API Layer (`api/`)
- **commands/** - Tauri command handlers that process requests from the frontend
- **models.rs** - Data structures for API communication

### Core Layer (`core/`)
- **claude/** - Core Claude integration logic, independent of Tauri
- **error.rs** - Application-wide error types and handling

### Infrastructure Layer (`infrastructure/`)
- **state.rs** - Manages application state and dependency injection

## Adding New Features

1. **New Command**: Add to `api/commands/` with a descriptive filename
2. **New Core Logic**: Add to appropriate module in `core/`
3. **New Infrastructure**: Add to `infrastructure/` if it's a cross-cutting concern
4. **Update mod.rs**: Export any new public items
5. **Register Command**: Add to the `invoke_handler!` macro in `lib.rs`

## Benefits

- **Maintainability**: Clear module boundaries make code easier to understand
- **Testability**: Core logic is separated from framework dependencies
- **Scalability**: New features can be added without affecting existing code
- **Type Safety**: Strong typing throughout with proper error handling