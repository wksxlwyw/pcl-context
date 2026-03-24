// src/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "pcl",
    version: "1.0.0",
  });

  // 注册 Resources、Tools、Prompts
  // 这里会在 Phase 2 中实现具体的注册逻辑
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log("PCL MCP Server started on stdio");
}

// 如果直接运行此文件，则启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(console.error);
}