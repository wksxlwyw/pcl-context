// src/mcp/prompts.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ContextStore } from '../core/context-store.js';
import { MemoryManager } from '../core/memory-manager.js';

export function registerPrompts(
  server: McpServer,
  contextStore: ContextStore,
  memoryManager: MemoryManager
): void {

  // 提示词 1：项目简报
  server.prompt(
    'project-briefing',
    '为 AI 生成当前项目的完整简报，帮助 AI 快速了解项目背景',
    {
      projectId: {
        type: 'string',
        description: '项目 ID'
      }
    },
    async (params) => {
      try {
        const { projectId } = params || {};
        const project = await contextStore.getProject(projectId);
        const userProfile = await contextStore.getUserProfile();
        
        if (!project) {
          return {
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: `项目 '${projectId}' 不存在。`,
              },
            }],
          };
        }

        // 构建项目简报
        let briefing = `# ${project.name || projectId} 项目简报\n\n`;
        
        if (project.description) {
          briefing += `## 项目简介\n${project.description}\n\n`;
        }
        
        // 技术栈
        if (project.tech_stack) {
          briefing += "## 技术栈\n";
          if (project.tech_stack.frontend) {
            briefing += `- 前端: ${project.tech_stack.frontend.join(', ')}\n`;
          }
          if (project.tech_stack.backend) {
            briefing += `- 后端: ${project.tech_stack.backend.join(', ')}\n`;
          }
          if (project.tech_stack.infrastructure) {
            briefing += `- 基础设施: ${project.tech_stack.infrastructure.join(', ')}\n`;
          }
          briefing += '\n';
        }
        
        // 架构
        if (project.architecture) {
          briefing += "## 架构决策\n";
          if (project.architecture.pattern) {
            briefing += `- 模式: ${project.architecture.pattern}\n`;
          }
          if (project.architecture.api_style) {
            briefing += `- API 风格: ${project.architecture.api_style}\n`;
          }
          if (project.architecture.auth) {
            briefing += `- 认证: ${project.architecture.auth}\n`;
          }
          briefing += '\n';
        }
        
        // 目标和约束
        if (project.goals && project.goals.length > 0) {
          briefing += "## 项目目标\n";
          for (const goal of project.goals) {
            briefing += `- ${goal}\n`;
          }
          briefing += '\n';
        }
        
        if (project.constraints && project.constraints.length > 0) {
          briefing += "## 项目约束\n";
          for (const constraint of project.constraints) {
            briefing += `- ${constraint}\n`;
          }
          briefing += '\n';
        }
        
        // 用户偏好
        if (userProfile && Object.keys(userProfile).length > 0) {
          briefing += "## 用户偏好\n";
          if (userProfile.role) {
            briefing += `- 角色: ${userProfile.role}\n`;
          }
          if (userProfile.communication_style) {
            briefing += `- 沟通风格: ${userProfile.communication_style}\n`;
          }
          if (userProfile.code_style) {
            briefing += `- 代码风格: ${userProfile.code_style}\n`;
          }
          briefing += '\n';
        }
        
        briefing += "---\n";
        briefing += "_以上信息由 PCL 从项目上下文中自动提取_";

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: briefing,
            },
          }],
        };
      } catch (error) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `生成项目简报时出错: ${(error as Error).message}`,
            },
          }],
        };
      }
    }
  );

  // 提示词 2：代码审查上下文
  server.prompt(
    'code-review-context',
    '为代码审查注入项目架构决策和编码规范',
    {
      projectId: {
        type: 'string',
        description: '项目 ID'
      }
    },
    async (params) => {
      try {
        const { projectId } = params || {};
        const project = await contextStore.getProject(projectId);
        if (!project) {
          return {
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: `项目 '${projectId}' 不存在。`,
              },
            }],
          };
        }

        let context = `# ${project.name || projectId} 代码审查上下文\n\n`;
        
        // 技术栈相关信息
        if (project.tech_stack) {
          context += "## 技术栈规范\n";
          if (project.tech_stack.frontend) {
            context += `- 前端框架: ${project.tech_stack.frontend.join(', ')}\n`;
          }
          if (project.tech_stack.backend) {
            context += `- 后端技术: ${project.tech_stack.backend.join(', ')}\n`;
          }
          context += '\n';
        }
        
        // 架构决策
        if (project.architecture) {
          context += "## 架构决策\n";
          if (project.architecture.pattern) {
            context += `- 架构模式: ${project.architecture.pattern}\n`;
          }
          if (project.architecture.api_style) {
            context += `- API 风格: ${project.architecture.api_style}\n`;
          }
          if (project.architecture.auth) {
            context += `- 认证方式: ${project.architecture.auth}\n`;
          }
          context += '\n';
        }
        
        // 检索相关记忆（架构、编码标准相关）
        const architectureDecisions = await memoryManager.recall({
          projectId,
          tags: ['architecture', 'coding-standard', 'decision', 'pattern'],
          limit: 10,
        });
        
        if (architectureDecisions.length > 0) {
          context += "## 重要架构决策\n";
          for (const decision of architectureDecisions) {
            const dateStr = new Date(decision.createdAt).toLocaleDateString('zh-CN');
            context += `- [${dateStr}] ${decision.content}\n`;
          }
          context += '\n';
        }
        
        // 用户编码偏好
        const userProfile = await contextStore.getUserProfile();
        if (userProfile.code_style) {
          context += `## 用户编码偏好\n- ${userProfile.code_style}\n\n`;
        }
        
        context += "---\n";
        context += "_以上代码审查上下文由 PCL 从项目上下文和历史决策中自动提取_";

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: context,
            },
          }],
        };
      } catch (error) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `生成代码审查上下文时出错: ${(error as Error).message}`,
            },
          }],
        };
      }
    }
  );
}