// src/mcp/tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ContextStore } from '../core/context-store.js';
import { InjectionEngine } from '../core/injection-engine.js';
import { MemoryManager } from '../core/memory-manager.js';
import { pickFields } from '../utils/object-utils.js';

export function registerTools(
  server: McpServer,
  contextStore: ContextStore,
  injectionEngine: InjectionEngine,
  memoryManager: MemoryManager
): void {

  // 工具 1：获取当前项目上下文
  server.tool(
    'pcl-get-context',
    '获取指定项目的完整上下文信息，包括技术栈、架构决策、目标等',
    {
      projectId: z.string().optional().describe('项目 ID，不指定则自动检测'),
      sections: z.array(z.string()).optional().describe('要获取的字段，如 ["tech_stack", "goals"]'),
    },
    async (params) => {
      try {
        const { projectId, sections } = params;
        const detectedProjectId = projectId;
        if (!detectedProjectId) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: projectId is required',
            }]
          };
        }
        const context = await contextStore.getProject(detectedProjectId);
        
        if (!context) {
          return {
            content: [{ 
              type: 'text' as const, 
              text: `Project '${detectedProjectId}' not found` 
            }]
          };
        }
        
        const filteredContext = sections ? pickFields(context, sections) : context;
        
        const yaml = await import('js-yaml');
        const yamlText = yaml.dump(filteredContext);
        
        return { 
          content: [{ type: 'text' as const, text: yamlText }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error retrieving context: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 2：智能上下文注入
  server.tool(
    'pcl-inject',
    '根据当前任务自动检索并注入相关上下文。在开始新任务前调用此工具获取背景信息。',
    {
      query: z.string().describe('当前任务描述或问题'),
      projectId: z.string().optional().describe('项目 ID'),
      maxTokens: z.number().optional().default(4000).describe('Token 预算，默认 4000'),
    },
    async (params) => {
      try {
        const { query, projectId, maxTokens } = params;
        const result = await injectionEngine.resolve({
          query,
          projectId,
          maxTokens: maxTokens ?? 4000,
          includeMemory: true,
        });
        
        return {
          content: [{ type: 'text' as const, text: result.systemPrompt }],
          _meta: { 
            resolveTimeMs: result.metadata.resolveTimeMs,
            chunksIncluded: result.metadata.chunksIncluded,
            totalTokens: result.metadata.totalTokens,
          },
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error during injection: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 3：保存记忆
  server.tool(
    'pcl-remember',
    '保存一条重要信息到持久记忆中，可在未来的对话中被自动检索',
    {
      text: z.string().describe('要记住的内容'),
      projectId: z.string().optional().describe('关联项目 ID'),
      tags: z.array(z.string()).optional().describe('标签数组'),
    },
    async (params) => {
      try {
        const { text, projectId, tags } = params;
        const entry = await memoryManager.remember(text, { 
          projectId, 
          tags,
          source: 'mcp-tool'
        });
        
        return {
          content: [{ type: 'text' as const, text: `✅ 已保存记忆 [${entry.id}]` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error saving memory: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 4：检索记忆
  server.tool(
    'pcl-recall',
    '检索历史记忆和决策记录',
    {
      query: z.string().optional().describe('搜索关键词'),
      projectId: z.string().optional().describe('项目 ID'),
      tags: z.array(z.string()).optional().describe('标签过滤'),
      days: z.number().optional().default(30).describe('回溯天数，默认30'),
      limit: z.number().optional().default(10).describe('结果数量限制，默认10'),
    },
    async (params) => {
      try {
        const { query, projectId, tags, days, limit } = params;
        
        const recallQuery: any = {
          projectId,
          tags,
          limit: limit ?? 10,
        };
        
        const effectiveDays = days ?? 30;
        const since = new Date();
        since.setDate(since.getDate() - effectiveDays);
        recallQuery.since = since;
        
        if (query) {
          recallQuery.text = query;
        }
        
        const entries = await memoryManager.recall(recallQuery);
        
        if (entries.length === 0) {
          return { 
            content: [{ type: 'text' as const, text: "没有找到匹配的记忆" }] 
          };
        }
        
        const formatted = entries.map(e => {
          const dateStr = new Date(e.createdAt).toLocaleDateString('zh-CN');
          const tagsStr = e.tags ? ` [${e.tags.join(', ')}]` : '';
          return `[${dateStr}${tagsStr}] ${e.content}`;
        }).join('\n---\n');
        
        return { 
          content: [{ type: 'text' as const, text: formatted }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error recalling memories: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 5：更新项目上下文
  server.tool(
    'pcl-update-context',
    '更新项目的上下文信息（如技术栈变更、新的架构决策等）',
    {
      projectId: z.string().describe('项目 ID'),
      field: z.string().describe('要更新的字段路径，如 "tech_stack.frontend"'),
      value: z.string().describe('新值（YAML 格式）'),
    },
    async (params) => {
      try {
        const { projectId, field, value } = params;
        
        const yaml = await import('js-yaml');
        let parsedValue;
        try {
          parsedValue = yaml.load(value);
        } catch (yamlError) {
          return {
            content: [{ type: 'text' as const, text: `Invalid YAML format: ${(yamlError as Error).message}` }],
          };
        }
        
        let project = await contextStore.getProject(projectId);
        if (!project) {
          await contextStore.createProject(projectId, { name: projectId });
          project = await contextStore.getProject(projectId);
          if (!project) {
            return {
              content: [{ type: 'text' as const, text: `Failed to create project '${projectId}'` }],
            };
          }
        }
        
        const updateData: any = {};
        updateData[field] = parsedValue;
        await contextStore.updateProject(projectId, updateData);
        
        return { 
          content: [{ type: 'text' as const, text: `✅ 已更新 ${projectId}.${field}` }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error updating context: ${(error as Error).message}` }],
        };
      }
    }
  );
}
