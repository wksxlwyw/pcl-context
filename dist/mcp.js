// src/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
async function startMcpServer() {
  const server = new McpServer({
    name: "pcl",
    version: "1.0.0"
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("PCL MCP Server started on stdio");
}
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(console.error);
}
export {
  startMcpServer
};
