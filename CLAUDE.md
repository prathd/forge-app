# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Always Reference PRD.md

**CRITICAL**: Before starting any implementation work, ALWAYS read and reference the current PRD.md file. The PRD is the single source of truth for:
- Product vision and goals
- Technical architecture decisions
- Feature specifications
- Implementation priorities

If there's any conflict between this file and PRD.md, the PRD takes precedence.

## Project Overview

Claude Agent Studio (codename: `forge`) is a desktop application that provides a powerful UI wrapper around the Claude Code CLI and SDK. It enables developers to create, configure, manage, and run multiple AI programming agents while maintaining full ownership of their Claude access and tokens.

### Key Principles
- **Developer Sovereignty**: Users own their Claude CLI access and pay Anthropic directly
- **Local-First**: All processing happens on the developer's machine
- **Zero Lock-in**: Users can always fall back to using Claude CLI directly
- **SDK-Powered**: Leverages Claude Code TypeScript SDK for advanced features

## Development Commands

Since this is a greenfield project, no commands are configured yet. Based on the PRD, the following commands will likely be used once the project is initialized:

```bash
# Expected package manager (per PRD)
pnpm install     # Install dependencies
pnpm dev         # Run development server
pnpm build       # Build for production
pnpm test        # Run tests (once configured)
pnpm lint        # Run linting (once configured)
pnpm typecheck   # Run TypeScript type checking
```

## Architecture Overview

### Tech Stack (from PRD)
- **Frontend**: Next.js 14+ with App Router
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: TailwindCSS with custom design system
- **State Management**: Zustand with persistence
- **Code Editor**: Monaco Editor with custom extensions
- **Data Fetching**: TanStack Query
- **Real-time**: WebSockets/Server-Sent Events
- **Desktop Packaging**: Tauri 2.0 (Rust + Web frontend)
- **Backend Integration**: Claude Code TypeScript SDK

### Core Components

1. **Agent Runtime Engine**
   - Uses Claude Code TypeScript SDK for programmatic control
   - Manages multiple agent instances with isolated environments
   - Supports MCP (Model Context Protocol) extensions
   - Handles conversation management and session continuity

2. **SDK Integration Layer**
   - Structured API calls via SDK instead of raw CLI
   - Type-safe message streaming
   - AbortController for graceful cancellation
   - Custom system prompts per agent

3. **Git Worktree Management**
   - Isolated worktrees per agent
   - Automatic branch creation/cleanup
   - Visual diff and merge UI

4. **UI Components**
   - Agent Workspace (primary view)
   - Agent Gallery (grid view with status)
   - Task Queue Manager (Kanban board)
   - Context Explorer
   - Review Center

## Implementation Guidelines

### Code Quality Principles

**Single Responsibility Principle (SRP)**: Every module, class, and function should have one, and only one, reason to change. This means:
- Each component should do one thing well
- Functions should have a single, clear purpose
- Classes should encapsulate a single concept
- Modules should have a cohesive set of related functionalities
- Avoid "god objects" or "utility dumping grounds"

**Architectural Organization**: Maintain a clean, hierarchical file structure:
- **Never** create files randomly at the root level
- **Always** organize code into appropriate folders and submodules
- Group related functionality together in dedicated directories
- Use barrel exports (index.ts) for clean module interfaces
- Follow the established folder structure below
- Create subdirectories when a module grows beyond 3-4 files
- Separate concerns: UI components, business logic, utilities, types
- Co-locate related files (component + styles + tests + types)

### File Structure (Expected)
```
forge-app/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   ├── agents/       # Agent-related components
│   │   ├── editor/       # Monaco editor wrapper
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Core libraries
│   │   ├── sdk/          # Claude Code SDK wrapper
│   │   ├── git/          # Git worktree management
│   │   └── store/        # Zustand stores
│   ├── hooks/            # React hooks
│   └── types/            # TypeScript types
├── src-tauri/            # Tauri backend (Rust)
├── public/               # Static assets
└── tests/                # Test files
```

### Key Implementation Notes

1. **Claude CLI/SDK Integration**
   - Users must have Claude CLI installed and authenticated
   - The app uses their existing Claude access tokens
   - All Claude interactions happen through the TypeScript SDK
   - Fallback to CLI for unsupported operations

2. **Agent Management**
   - Each agent runs in its own SDK instance
   - Agents have isolated git worktrees
   - Support for parallel execution
   - Session IDs for conversation continuity

3. **Security Considerations**
   - No API keys stored by the application
   - Inherits user's git credentials
   - All processing local
   - Zero telemetry without opt-in

4. **Performance Targets**
   - CLI spawn time: <1s per agent
   - UI responsiveness: <100ms
   - Memory: <300MB base, <50MB per agent
   - Cold start: <3s

## Development Workflow

1. **Before implementing any feature**:
   - Check PRD.md for specifications
   - Verify the feature is in the current MVP phase
   - Consider the architectural implications

2. **When creating new components**:
   - Follow the established patterns in the codebase
   - Use shadcn/ui components where applicable
   - Ensure TypeScript types are properly defined

3. **For Claude SDK integration**:
   - Use the TypeScript SDK methods
   - Handle errors gracefully
   - Implement proper abort handling
   - Stream messages with type safety

4. **Testing approach**:
   - Unit tests for SDK wrapper functions
   - Integration tests for agent operations
   - E2E tests for critical user flows

## Common Tasks

### Creating a New Agent Type
1. Define the agent configuration interface
2. Implement the agent creation logic in the SDK wrapper
3. Add UI components for agent configuration
4. Update the agent gallery to display the new type

### Adding MCP Extensions
1. Define the extension interface
2. Register extensions with the SDK
3. Add UI for extension management
4. Handle hot-reloading of extensions

### Implementing Git Worktree Support
1. Use the git worktree commands
2. Manage branch creation/deletion
3. Handle worktree switching
4. Implement merge conflict resolution

## Important Reminders

- **Always check PRD.md first** for any implementation decisions
- Users own their Claude access - we never store credentials
- All features should work offline (local-first)
- Maintain TypeScript type safety throughout
- Follow the phased MVP approach outlined in the PRD

## Implementation Plan & Progress Tracking

### MVP Phase 1: Core Foundation (Weeks 1-4)
**Goal**: Basic agent creation, Claude API integration, simple task execution

#### Week 1: Project Setup & Architecture
- [x] Replace current Vite setup with Next.js 14+ App Router
- [x] Configure TypeScript with strict mode
- [x] Set up TailwindCSS and shadcn/ui
- [x] Configure Tauri for desktop packaging
- [x] Create base folder structure
- [x] Set up Zustand for state management
- [x] Configure TanStack Query

#### Week 2: Claude SDK Integration Layer
- [x] Create Claude Code SDK wrapper (`src/lib/sdk/`)
- [x] Implement agent configuration interfaces
- [x] Build agent runtime engine with SDK
- [x] Add message streaming with TypeScript types
- [x] Implement AbortController for cancellation
- [x] Create error handling and retry logic
- [x] Add session management

#### Week 3: Basic UI Components
- [ ] Create Agent Workspace layout
- [ ] Build agent creation dialog
- [ ] Implement agent list sidebar
- [ ] Add basic output viewer
- [ ] Create status indicators
- [ ] Build simple task input form
- [ ] Add copy output functionality

#### Week 4: Git Integration & Testing
- [ ] Implement basic git operations
- [ ] Add branch management
- [ ] Create simple diff viewer
- [ ] Set up testing infrastructure
- [ ] Write initial unit tests
- [ ] Create E2E test setup
- [ ] Documentation updates

### MVP Phase 2: Editor & Workflow (Weeks 5-8)
**Goal**: Monaco editor, diff viewing, git worktrees, context management

#### Week 5: Monaco Editor Integration
- [ ] Integrate Monaco Editor
- [ ] Add syntax highlighting
- [ ] Implement file tree navigation
- [ ] Create multi-pane layouts
- [ ] Add IntelliSense support
- [ ] Build editor preferences

#### Week 6: Git Worktree Support
- [ ] Implement worktree creation per agent
- [ ] Add worktree switching logic
- [ ] Create branch visualization
- [ ] Build merge conflict UI
- [ ] Add automatic cleanup
- [ ] Implement isolation checks

#### Week 7: Context Management
- [ ] Create context explorer UI
- [ ] Build context sources system
- [ ] Implement context pruning
- [ ] Add visual context usage
- [ ] Create manual injection UI
- [ ] Build sharing mechanism

#### Week 8: Agent Dashboard
- [ ] Create status dashboard
- [ ] Add performance metrics
- [ ] Build token usage tracking
- [ ] Implement health indicators
- [ ] Add activity monitoring
- [ ] Create analytics views

### MVP Phase 3: Advanced Features (Weeks 9-12)
**Goal**: Parallel execution, task queues, background execution, review workflow

#### Week 9: Parallel Agent Execution
- [ ] Implement concurrent SDK instances
- [ ] Add resource management
- [ ] Create execution scheduler
- [ ] Build queue system
- [ ] Add progress tracking
- [ ] Implement load balancing

#### Week 10: Task Queue Management
- [ ] Build Kanban board UI
- [ ] Add drag-and-drop functionality
- [ ] Create task assignment logic
- [ ] Implement priority system
- [ ] Add dependency tracking
- [ ] Build burndown charts

#### Week 11: Background Execution
- [ ] Create background job system
- [ ] Add job persistence
- [ ] Implement progress reporting
- [ ] Build notification system
- [ ] Add pause/resume functionality
- [ ] Create job history

#### Week 12: Review Workflow
- [ ] Build diff viewer component
- [ ] Create approval workflow
- [ ] Add inline commenting
- [ ] Implement batch operations
- [ ] Build review queue
- [ ] Add quality metrics

### MVP Phase 4: Polish & Scale (Weeks 13-16)
**Goal**: Desktop packaging, auto-updates, templates, team features

#### Week 13: Tauri Desktop App
- [ ] Configure production builds
- [ ] Set up code signing
- [ ] Create installers for platforms
- [ ] Add auto-update system
- [ ] Implement crash reporting
- [ ] Build system tray integration

#### Week 14: Agent Templates
- [ ] Create template system
- [ ] Build template gallery
- [ ] Add import/export functionality
- [ ] Create default templates
- [ ] Implement template sharing
- [ ] Add customization options

#### Week 15: Team Features
- [ ] Build sharing mechanisms
- [ ] Add configuration sync
- [ ] Create team dashboards
- [ ] Implement access controls
- [ ] Add audit logging
- [ ] Build collaboration tools

#### Week 16: Final Polish
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Launch preparation
- [ ] Community setup

### Current Implementation Status

**Project State**: Week 2 Complete - Claude SDK Integration Layer implemented
**Completed Week 1**:
- Migrated from Vite to Next.js 14 with App Router
- Configured TypeScript with strict mode
- Set up TailwindCSS v3 and shadcn/ui
- Configured Tauri for desktop packaging
- Created project folder structure per PRD
- Implemented Zustand store for agent management
- Configured TanStack Query for data fetching

**Completed Week 2**:
- Created Claude Code SDK wrapper using @anthropic-ai/claude-code
- Implemented comprehensive agent configuration interfaces
- Built agent runtime engine with message streaming
- Added TypeScript types for all SDK interactions
- Implemented AbortController for query cancellation
- Created error handling with retry logic
- Added session management for conversation continuity
- Integrated runtime with React components via hooks
- Updated UI to support real-time messaging

**Next Steps**: Begin Week 3 - Basic UI Components (Note: many already completed)

### Technical Debt Log
- None yet (greenfield project)

### Decision Log
- Using Tauri 2.0 for desktop packaging (lighter than Electron)
- TypeScript SDK over raw CLI for better type safety
- Zustand for state management (simpler than Redux)
- shadcn/ui for consistent, accessible components