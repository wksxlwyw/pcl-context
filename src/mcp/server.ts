// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ContextStore } from '../core/context-store.js';
import { FileStore } from '../storage/file-store.js';
import { ConfigManager } from '../storage/config-manager.js';
import { GitManager } from '../storage/git-manager.js';
import { InjectionEngine } from '../core/injection-engine.js';
import { SearchIndex } from '../core/search-index.js';
import { TokenBudget } from '../core/token-budget.js';
import { MemoryManager } from '../core/memory-manager.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
import { getPclHome } from '../utils/path-utils.js';

export async function startMcpServer(): Promise<void> {
  try {
    // 初始化所有依赖
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    
    const searchIndex = new SearchIndex();
    await searchIndex.rebuild(fileStore);
    
    const tokenBudget = new TokenBudget();
    const contextStore = new ContextStore(fileStore, gitManager);
    const injectionEngine = new InjectionEngine(contextStore, searchIndex, tokenBudget, configManager);
    const memoryManager = new MemoryManager(fileStore, searchIndex);

    // 创建MCP服务器
    const server = new McpServer({
      name: "pcl",
      version: "1.0.0",
      description: "Persistent Context Layer - 让 AI 记住你的一切"
    });

    // 注册所有MCP能力
    registerResources(server, contextStore, memoryManager);
    registerTools(server, contextStore, injectionEngine, memoryManager);
    registerPrompts(server, contextStore, memoryManager);

    // 使用stdio传输
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[PCL MCP Server] Server started successfully');

    // 保持进程运行
    return new Promise(() => {});
  } catch (error) {
    console.error('[PCL MCP Server] Fatal error:', error);
    process.exit(1);
  }
}