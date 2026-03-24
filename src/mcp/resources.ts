// src/mcp/resources.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ContextStore } from '../core/context-store';
import { MemoryManager } from '../core/memory-manager';
import { join } from 'path';

export function registerResources(
  server: McpServer,
  contextStore: ContextStore,
  memoryManager: MemoryManager
): void {

  // 用户档案资源
  server.resource(
    "user-profile",
    "pcl://contexts/user-profile",
    { 
      description: "用户个人档案，包含技能、偏好、工作风格" 
    },
    async () => {
      try {
        const profile = await contextStore.getUserProfile();
        const yaml = await import('js-yaml');
        const yamlText = yaml.dump(profile);
        
        return {
          contents: [{
            uri: "pcl://contexts/user-profile",
            mimeType: "text/yaml",
            text: yamlText,
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: "pcl://contexts/user-profile",
            mimeType: "text/plain",
            text: `Error loading user profile: ${(error as Error).message}`,
          }],
        };
      }
    }
  );

  // 项目上下文资源
  server.resource(
    "project-context",
    "pcl://contexts/projects/{projectId}",
    { 
      description: "项目上下文信息", 
      parameters: {
        projectId: {
          type: "string",
          description: "项目ID"
        }
      }
    },
    async (_, params) => {
      try {
        const projectId = params?.projectId;
        if (!projectId) {
          throw new Error("Missing projectId parameter");
        }
        
        const project = await contextStore.getProject(projectId);
        if (!project) {
          throw new Error(`Project '${projectId}' not found`);
        }
        
        const yaml = await import('js-yaml');
        const yamlText = yaml.dump(project);
        
        return {
          contents: [{
            uri: `pcl://contexts/projects/${projectId}`,
            mimeType: "text/yaml",
            text: yamlText,
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: `pcl://contexts/projects/${params?.projectId || 'unknown'}`,
            mimeType: "text/plain",
            text: `Error loading project context: ${(error as Error).message}`,
          }],
        };
      }
    }
  );

  // 最近记忆资源
  server.resource(
    "recent-memories",
    "pcl://memories/recent",
    { 
      description: "最近 7 天的记忆条目" 
    },
    async () => {
      try {
        // 获取最近7天的记忆
        const since = new Date();
        since.setDate(since.getDate() - 7);
        
        const entries = await memoryManager.recall({
          since,
          limit: 50,
        });
        
        if (entries.length === 0) {
          return {
            contents: [{
              uri: "pcl://memories/recent",
              mimeType: "text/markdown",
              text: "最近7天没有记忆条目",
            }],
          };
        }
        
        // 格式化为markdown
        const markdownContent = entries.map(entry => {
          const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN');
          const tagsStr = entry.tags && entry.tags.length > 0 ? ` (${entry.tags.join(', ')})` : '';
          return `### ${dateStr}${tagsStr}\n\n${entry.content}\n\n---\n`;
        }).join('');
        
        return {
          contents: [{
            uri: "pcl://memories/recent",
            mimeType: "text/markdown",
            text: markdownContent,
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: "pcl://memories/recent",
            mimeType: "text/plain",
            text: `Error loading recent memories: ${(error as Error).message}`,
          }],
        };
      }
    }
  );
}