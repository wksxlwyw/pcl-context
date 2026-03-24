import { defineConfig } from "tsup";

export default defineConfig([
  // CLI 入口
  {
    entry: { cli: "src/cli/index.ts" },
    format: "esm",
    target: "node18",
    outDir: "dist",
    clean: true,
    banner: { js: "#!/usr/bin/env node" },
    // 不 bundle 依赖（npm install 管理）
    external: [
      "@modelcontextprotocol/sdk",
      "commander",
      "js-yaml",
      "simple-git",
      "flexsearch",
      "chalk",
      "glob",
      "proper-lockfile",
    ],
    dts: false, // CLI 不需要类型声明
  },
  // MCP Server 入口
  {
    entry: { mcp: "src/mcp/server.ts" },
    format: "esm",
    target: "node18",
    outDir: "dist",
    external: [
      "@modelcontextprotocol/sdk",
      "js-yaml",
      "simple-git",
      "flexsearch",
      "glob",
      "proper-lockfile",
    ],
    dts: false,
  },
]);