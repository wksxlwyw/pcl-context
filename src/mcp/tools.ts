// src/mcp/tools.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
      projectId: {
        type: 'string',
        description: '项目 ID，不指定则自动检测'
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: '要获取的字段，如 ["tech_stack", "goals"]'
      }
    },
    async (params) => {
      try {
        const { projectId, sections } = params || {};
        // 这里应该从环境或某种方式检测当前项目
        const detectedProjectId = projectId; // 简化版本，直接使用传入的ID
        const context = await contextStore.getProject(detectedProjectId);
        
        if (!context) {
          return {
            content: [{ 
              type: 'text', 
              text: `Project '${detectedProjectId}' not found` 
            }]
          };
        }
        
        const filteredContext = sections ? pickFields(context, sections) : context;
        
        // 使用yaml.dump将上下文转换为YAML格式
        const yaml = await import('js-yaml');
        const yamlText = yaml.dump(filteredContext);
        
        return { 
          content: [{ type: 'text', text: yamlText }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error retrieving context: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 2：智能上下文注入
  server.tool(
    'pcl-inject',
    '根据当前任务自动检索并注入相关上下文。在开始新任务前调用此工具获取背景信息。',
    {
      query: {
        type: 'string',
        description: '当前任务描述或问题'
      },
      projectId: {
        type: 'string',
        description: '项目 ID'
      },
      maxTokens: {
        type: 'number',
        description: 'Token 预算，默认 4000',
        default: 4000
      }
    },
    async (params) => {
      try {
        const { query, projectId, maxTokens = 4000 } = params || {};
        const result = await injectionEngine.resolve({
          query,
          projectId,
          maxTokens,
          includeMemory: true,
        });
        
        return {
          content: [{ type: 'text', text: result.systemPrompt }],
          _meta: { 
            resolveTimeMs: result.metadata.resolveTimeMs,
            chunksIncluded: result.metadata.chunksIncluded,
            totalTokens: result.metadata.totalTokens,
          },
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error during injection: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 3：保存记忆
  server.tool(
    'pcl-remember',
    '保存一条重要信息到持久记忆中，可在未来的对话中被自动检索',
    {
      text: {
        type: 'string',
        description: '要记住的内容'
      },
      projectId: {
        type: 'string',
        description: '关联项目 ID'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '标签数组'
      }
    },
    async (params) => {
      try {
        const { text, projectId, tags } = params || {};
        const entry = await memoryManager.remember(text, { 
          projectId, 
          tags,
          source: 'mcp-tool'
        });
        
        return {
          content: [{ type: 'text', text: `✅ 已保存记忆 [${entry.id}]` }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error saving memory: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 4：检索记忆
  server.tool(
    'pcl-recall',
    '检索历史记忆和决策记录',
    {
      query: {
        type: 'string',
        description: '搜索关键词'
      },
      projectId: {
        type: 'string',
        description: '项目 ID'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '标签过滤'
      },
      days: {
        type: 'number',
        description: '回溯天数，默认30',
        default: 30
      },
      limit: {
        type: 'number',
        description: '结果数量限制，默认10',
        default: 10
      }
    },
    async (params) => {
      try {
        const { query, projectId, tags, days = 30, limit = 10 } = params || {};
        
        const recallQuery: any = {
          projectId,
          tags,
          limit,
        };
        
        // 如果提供了days参数，计算since日期
        if (days !== undefined) {
          const since = new Date();
          since.setDate(since.getDate() - days);
          recallQuery.since = since;
        }
        
        // 如果提供了query，则作为文本搜索
        if (query) {
          recallQuery.text = query;
        }
        
        const entries = await memoryManager.recall(recallQuery);
        
        if (entries.length === 0) {
          return { 
            content: [{ type: 'text', text: "没有找到匹配的记忆" }] 
          };
        }
        
        const formatted = entries.map(e => {
          const dateStr = new Date(e.createdAt).toLocaleDateString('zh-CN');
          const tagsStr = e.tags ? ` [${e.tags.join(', ')}]` : '';
          return `[${dateStr}${tagsStr}] ${e.content}`;
        }).join('\n---\n');
        
        return { 
          content: [{ type: 'text', text: formatted }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error recalling memories: ${(error as Error).message}` }],
        };
      }
    }
  );

  // 工具 5：更新项目上下文
  server.tool(
    'pcl-update-context',
    '更新项目的上下文信息（如技术栈变更、新的架构决策等）',
    {
      projectId: {
        type: 'string',
        description: '项目 ID'
      },
      field: {
        type: 'string',
        description: '要更新的字段路径，如 "tech_stack.frontend"'
      },
      value: {
        type: 'string',
        description: '新值（YAML 格式）'
      }
    },
    async (params) => {
      try {
        const { projectId, field, value } = params || {};
        
        // 解析YAML值
        const yaml = await import('js-yaml');
        let parsedValue;
        try {
          parsedValue = yaml.load(value);
        } catch (yamlError) {
          return {
            content: [{ type: 'text', text: `Invalid YAML format: ${(yamlError as Error).message}` }],
          };
        }
        
        // 获取当前项目
        let project = await contextStore.getProject(projectId);
        if (!project) {
          // 如果项目不存在，创建一个基本项目
          await contextStore.createProject(projectId, { name: projectId });
          project = await contextStore.getProject(projectId);
          if (!project) {
            return {
              content: [{ type: 'text', text: `Failed to create project '${projectId}'` }],
            };
          }
        }
        
        // 更新指定字段
        const updateData: any = {};
        updateData[field] = parsedValue;
        await contextStore.updateProject(projectId, updateData);
        
        return { 
          content: [{ type: 'text', text: `✅ 已更新 ${projectId}.${field}` }] 
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error updating context: ${(error as Error).message}` }],
        };
      }
    }
  );
}