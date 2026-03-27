# PCL - Persistent Context Layer

Persistent Context Layer (PCL) is a tool that helps AI assistants remember context through local file storage and MCP protocol integration.

## Features

- **Local-First**: All data stored in `~/.pcl/` directory
- **File-as-Database**: Uses YAML and Markdown formats for data storage  
- **MCP Protocol Support**: Integrates with Cursor, Claude, and other AI tools
- **Version Control**: Automatic Git commits for change tracking
- **Context Injection**: Intelligent retrieval of relevant context for AI usage

## Installation

```bash
npm install -g pcl-context
```

## Quick Start

```bash
# Initialize PCL
pcl init

# Set user information
pcl set user.name "Your Name"
pcl set user.role "Developer"

# Create project context
pcl set -p my-project name "My Project"
pcl set -p my-project description "A sample project"
pcl set -p my-project tech_stack.frontend.[] "React"
pcl set -p my-project tech_stack.backend.[] "Node.js"

# Get information
pcl get -p my-project tech_stack

# List projects
pcl list projects
```

## CLI Commands

### Basic Commands
- `pcl init`: Initialize PCL
- `pcl set <path> <value>`: Set context field
- `pcl get <path>`: Get context field  
- `pcl list [type]`: List projects or memories

### Project Management
- `pcl project create <id> [options]`: Create new project

### Context Injection
- `pcl inject [query]`: Intelligent context injection
- `pcl remember <text>`: Save memory entry
- `pcl recall [query]`: Retrieve memories

### Version Control (Phase 3)
- `pcl history`: View context change history
- `pcl diff [ref1] [ref2]`: View differences between versions
- `pcl rollback <ref>`: Rollback to specified version
- `pcl snapshot <name>`: Create named snapshot

### MCP Integration
- `pcl mcp`: Start MCP server (stdio mode)

## Architecture

PCL uses a layered architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interaction Layer                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐     │
│  │  CLI Tool │  │  MCP Server │  │ AI Tools (Cursor/Claude etc)│   │
│  │  (pcl)   │  │  (stdio)   │  │   via MCP Client         │     │
│  └────┬─────┘  └─────┬──────┘  └────────────┬─────────────┘     │
│       │              │                       │                   │
└───────┼──────────────┼───────────────────────┼──────────────────┘
        │              │                       │
        ▼              ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Service Layer                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ ContextStore │  │ InjectionEng │  │ MemoryManager       │    │
│  │ Context Mgmt │  │ Context Inject│ │ Cross-session Memory │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘    │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SearchIndex (Retrieval Layer)                │   │
│  │         FlexSearch Full-text + Keyword/Tag Matching       │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ FileStore    │  │ GitManager   │  │ ConfigManager        │   │
│  │ YAML/MD Files│  │ simple-git   │  │ config.yaml          │   │
│  │ ~/.pcl/      │  │ Auto-commit/Snapshots │ Global/Project Config │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript  
- **Module System**: ES Modules
- **Build Tool**: tsup (based on esbuild)
- **Package Manager**: npm

## Development

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## Contributing

We welcome contributions! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT License](LICENSE)

## Privacy Statement

PCL is a **local-first** tool:
- All data is stored locally in `~/.pcl/` directory
- No data is sent to the cloud
- Fully open source - you can review all code
- Suitable for privacy-sensitive scenarios