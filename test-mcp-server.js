#!/usr/bin/env node
// test-mcp-server.js - 测试MCP Server启动

import { spawn } from 'child_process';
import { join } from 'path';

console.log('Testing MCP Server startup...');

// 启动MCP服务器
const serverProcess = spawn('node', [join(process.cwd(), 'src/mcp/server.ts')], {
  env: { ...process.env, PCL_HOME: '/tmp/pcl-test' },
  stdio: ['pipe', 'pipe', 'pipe'] // stdio模式用于MCP
});

let started = false;

serverProcess.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data}`);
  if (data.toString().includes('Server started successfully')) {
    started = true;
    console.log('✓ MCP Server started successfully');
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
  if (data.toString().includes('Server started successfully')) {
    started = true;
    console.log('✓ MCP Server started successfully');
  }
});

serverProcess.on('error', (err) => {
  console.error('✗ Failed to start server:', err.message);
});

// 5秒后如果没有启动成功则认为失败
setTimeout(() => {
  if (!started) {
    console.log('✗ MCP Server failed to start within 5 seconds');
    serverProcess.kill();
    process.exit(1);
  } else {
    console.log('✓ Test passed - MCP Server ready for stdio communication');
    serverProcess.kill(); // 结束测试
    process.exit(0);
  }
}, 5000);