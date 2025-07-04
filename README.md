# Claude Agent Studio (Forge)

<div align="center">
  <img src="public/logo.png" alt="Claude Agent Studio Logo" width="128" height="128" />
  
  **A powerful desktop application for orchestrating AI programming agents**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![PRD](https://img.shields.io/badge/PRD-Product%20Requirements-green.svg)](PRD.md)
  [![Claude CLI](https://img.shields.io/badge/requires-Claude%20CLI-orange.svg)](https://docs.anthropic.com/en/docs/claude-code/overview)
  
  [Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Contributing](#contributing)
</div>

---

## 🚀 Overview

Claude Agent Studio (codename: Forge) is a desktop application that provides a powerful UI wrapper around the Claude Code CLI and SDK. It enables developers to create, configure, manage, and run multiple AI programming agents while maintaining full ownership of their Claude access and tokens.

### Key Benefits

- 🔐 **Developer Sovereignty** - Use your own Claude CLI subscription
- 🏠 **Local-First** - All processing happens on your machine
- 🔓 **Zero Lock-in** - Always fallback to Claude CLI directly
- ⚡ **Parallel Agents** - Run multiple agents simultaneously
- 🌳 **Git Worktrees** - Isolated environments per agent
- 🎯 **Type-Safe** - Built with TypeScript and Claude Code SDK

## ✨ Features

### Agent Management
- Create multiple agent types (Task, Explorer, Builder, Review)
- Configure custom system prompts and parameters
- Run agents in parallel with isolated git worktrees
- Background execution with progress tracking

### Development Environment
- Integrated Monaco Editor (VSCode engine)
- Real-time diff viewing between agents
- Git integration with visual branch management
- Model Context Protocol (MCP) extension support

### Collaboration & Review
- Kanban-style task management
- Code review workflows
- Agent performance analytics
- Export/import agent configurations

## 📋 Prerequisites

- **Operating System**: macOS 12+, Windows 10+, or Linux (Ubuntu 20.04+)
- **Node.js**: Version 18 or higher
- **Rust**: Version 1.70 or higher (for Tauri backend)
- **Git**: Version 2.35 or higher
- **Claude CLI**: Installed and authenticated ([Get Claude CLI](https://docs.anthropic.com/en/docs/claude-code/overview))
- **pnpm**: Version 8 or higher (install with `npm install -g pnpm`)

## 🛠️ Installation

### From Release (Recommended)

1. Download the latest release for your platform from the [Releases](https://github.com/yourusername/forge/releases) page
2. Install the application:
   - **macOS**: Open the `.dmg` file and drag to Applications
   - **Windows**: Run the `.msi` installer
   - **Linux**: Use the `.AppImage` or `.deb` package

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/forge.git
cd forge/forge-app

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## 🎯 Usage

### Quick Start

1. **Verify Claude CLI** is installed and authenticated:
   ```bash
   claude --version
   ```

2. **Launch Claude Agent Studio**

3. **Create your first agent**:
   - Click "New Agent" in the sidebar
   - Choose agent type (e.g., "Task Agent")
   - Configure the agent with a name and system prompt
   - Assign a task or start chatting

### Example Workflows

#### Parallel Feature Development
```typescript
// Create two agents to implement the same feature differently
const agent1 = await createAgent({
  type: 'builder',
  name: 'React Implementation',
  systemPrompt: 'Implement using React functional components'
});

const agent2 = await createAgent({
  type: 'builder', 
  name: 'Vue Implementation',
  systemPrompt: 'Implement using Vue 3 composition API'
});
```

#### Code Review with AI
1. Create a Review Agent
2. Drag code changes to the agent
3. Get detailed feedback and suggestions
4. Apply recommended improvements

## 💻 Development

### Project Structure
```
forge-app/
├── src/              # Frontend source (Next.js)
├── src-tauri/        # Tauri backend (Rust)
├── PRD.md            # Product Requirements Document
├── CLAUDE.md         # Claude Code guidelines
└── README.md         # This file
```

### Tech Stack
- **Frontend**: Next.js 14+, React, TypeScript
- **UI**: shadcn/ui, Radix UI, TailwindCSS
- **Desktop**: Tauri 2.0 (Rust)
- **State**: Zustand
- **Editor**: Monaco Editor
- **Claude Integration**: Claude Code TypeScript SDK

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build
```

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. No API keys needed! The app uses your Claude CLI authentication.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Read the [PRD.md](PRD.md) for product specifications
2. Check [CLAUDE.md](CLAUDE.md) for AI assistant guidelines
3. Fork the repository
4. Create a feature branch (`git checkout -b feature/amazing-feature`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed

## 📚 Documentation

- [Product Requirements Document (PRD)](PRD.md) - Detailed product specifications
- [Claude Guidelines](CLAUDE.md) - Instructions for AI development assistance
- [API Documentation](docs/api.md) - SDK and API reference
- [Architecture Guide](docs/architecture.md) - System design details

## 🔒 Security

- No API keys or credentials are stored by the application
- All Claude interactions use your local CLI authentication
- File system access respects OS permissions
- Zero telemetry without explicit opt-in

Report security vulnerabilities to: security@example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and Claude Code CLI
- [Tauri](https://tauri.app) for the desktop framework
- [shadcn/ui](https://ui.shadcn.com) for the component library
- Inspired by [Cursor](https://cursor.com) and other AI development tools

## 📞 Support

- [Documentation](https://docs.example.com)
- [Discord Community](https://discord.gg/example)
- [GitHub Issues](https://github.com/yourusername/forge/issues)
- [Twitter](https://twitter.com/example)

---

<div align="center">
  Made with ❤️ by developers, for developers
</div>