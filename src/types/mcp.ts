// src/types/mcp.ts
import { z } from 'zod';

// MCP相关的类型定义
export interface McpServerConfig {
  name: string;
  version: string;
  description?: string;
}

// Injection Engine 相关类型
export interface InjectionRequest {
  query?: string;           // 用户请求文本
  cwd?: string;             // 当前工作目录
  projectId?: string;       // 明确指定的项目
  tags?: string[];          // 标签过滤
  maxTokens?: number;       // Token 预算覆盖
  includeMemory?: boolean;  // 是否包含历史记忆
}

export interface ContextChunk {
  id: string;
  projectId?: string;
  type: 'project' | 'user-profile' | 'memory' | 'session' | 'global';
  content: string;
  updatedAt: string;
  tags?: string[];
  searchScore?: number;
}

export interface ScoredChunk extends ContextChunk {
  finalScore: number;
}

export interface InjectionResult {
  systemPrompt: string;
  chunks: ContextChunk[];
  metadata: {
    totalTokens: number;
    projectDetected: string | null;
    chunksIncluded: number;
    resolveTimeMs: number;
  };
}

// Memory Manager 相关类型
export interface RememberOptions {
  projectId?: string;
  tags?: string[];
  source?: string;         // 来源工具（claude/cursor/chatgpt）
}

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt: string;
  projectId?: string;
  tags?: string[];
  source?: string;
}

export interface RecallQuery {
  text?: string;           // 全文搜索
  projectId?: string;
  tags?: string[];
  since?: Date;            // 时间范围
  limit?: number;
}

// Token Budget 相关类型
export interface TokenEstimation {
  chars: number;
  tokens: number;
  language: 'english' | 'chinese' | 'mixed';
}

// Search Index 相关类型
export interface IndexDocument {
  id: string;
  projectId?: string;
  content: string;
  type: string;
  tags?: string[];
  updatedAt: string;
}

export interface QueryFilters {
  projectId?: string;
  tags?: string[];
  maxResults?: number;
}

export interface SearchResult extends IndexDocument {
  relevance: number;
}

// Zod schemas for MCP tools
export const GetContextSchema = z.object({
  projectId: z.string().optional(),
  sections: z.array(z.string()).optional(),
});

export const InjectSchema = z.object({
  query: z.string(),
  projectId: z.string().optional(),
  maxTokens: z.number().optional(),
});

export const RememberSchema = z.object({
  text: z.string(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const RecallSchema = z.object({
  query: z.string().optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  days: z.number().optional().default(30),
  limit: z.number().optional().default(10),
});

export const UpdateContextSchema = z.object({
  projectId: z.string(),
  field: z.string(),
  value: z.string(),
});