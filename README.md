# PCL - Persistent Context Layer

Persistent Context Layer (PCL) 是一个让 AI 助手记住上下文的工具，通过本地文件存储和 MCP 协议实现。

## 功能特性

- **本地优先**: 所有数据存储在 `~/.pcl/` 目录
- **文件即数据库**: 使用 YAML 和 Markdown 格式存储数据
- **MCP 协议支持**: 与 Cursor、Claude 等 AI 工具集成
- **版本控制**: 自动 Git 提交跟踪变更
- **上下文注入**: 智能检索相关上下文供 AI 使用

## 安装

```bash
npm install -g pcl-context
```

## 快速开始

```bash
# 初始化 PCL
pcl init

# 设置用户信息
pcl set user.name "Your Name"
pcl set user.role "Developer"

# 创建项目上下文
pcl set -p my-project name "My Project"
pcl set -p my-project description "A sample project"
pcl set -p my-project tech_stack.frontend.[] "React"
pcl set -p my-project tech_stack.backend.[] "Node.js"

# 获取信息
pcl get -p my-project tech_stack

# 列出项目
pcl list projects
```

## CLI 命令

- `pcl init`: 初始化 PCL
- `pcl set <path> <value>`: 设置上下文字段
- `pcl get <path>`: 获取上下文字段
- `pcl list [type]`: 列出项目或记忆
- `pcl project create <id> [options]`: 创建新项目
- `pcl mcp`: 启动 MCP 服务器

## 架构

PCL 采用分层架构：

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户交互层                                │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐     │
│  │  CLI 工具 │  │  MCP Server │  │ AI 工具（Cursor/Claude等）│     │
│  │  (pcl)   │  │  (stdio)   │  │   via MCP Client         │     │
│  └────┬─────┘  └─────┬──────┘  └────────────┬─────────────┘     │
│       │              │                       │                   │
└───────┼──────────────┼───────────────────────┼──────────────────┘
        │              │                       │
        ▼              ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      核心服务层（Core）                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ ContextStore │  │ InjectionEng │  │ MemoryManager       │    │
│  │ 上下文存储管理 │  │ 上下文注入引擎 │  │ 跨会话记忆管理       │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘    │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SearchIndex（检索索引层）                     │   │
│  │         FlexSearch 全文索引 + 关键词/标签匹配              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      持久化层                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ FileStore    │  │ GitManager   │  │ ConfigManager        │   │
│  │ YAML/MD 文件  │  │ simple-git   │  │ config.yaml          │   │
│  │ ~/.pcl/      │  │ 自动提交/快照  │  │ 全局/项目配置          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript
- **模块系统**: ES Modules
- **构建工具**: tsup (基于 esbuild)
- **依赖管理**: npm

## 开发

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 开发模式
npm run dev
```

## 许可证

MIT