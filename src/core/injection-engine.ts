// src/core/injection-engine.ts
import { ContextStore } from './context-store.js';
import { SearchIndex } from './search-index.js';
import { TokenBudget } from './token-budget.js';
import { ConfigManager } from '../storage/config-manager.js';
import { ProjectDetector } from '../utils/project-detector.js';
import { InjectionRequest, InjectionResult, ContextChunk, ScoredChunk } from '../types/mcp.js';

export class InjectionEngine {
  private projectDetector: ProjectDetector;

  constructor(
    private contextStore: ContextStore,
    private searchIndex: SearchIndex,
    private tokenBudget: TokenBudget,
    private config: ConfigManager
  ) {
    this.projectDetector = new ProjectDetector(config, contextStore);
  }

  /**
   * 核心注入方法 - 根据请求智能检索并构建上下文
   */
  async resolve(request: InjectionRequest): Promise<InjectionResult> {
    const startTime = Date.now();

    // 1. 检测当前项目
    const project = await this.detectProject(request);
    const effectiveProjectId = request.projectId || project?.id;

    // 2. 构建查询参数
    const query = request.query || '';
    const filters = {
      projectId: effectiveProjectId,
      tags: request.tags,
      maxResults: 20,
    };

    // 3. 执行搜索
    const relevantChunks = await this.searchIndex.query(query, filters);

    // 4. 评分和排序
    const scoredChunks = this.scoreAndRank(relevantChunks, request);

    // 5. 计算Token预算
    const budgetConfig = await this.config.get('injection');
    const maxTokens = request.maxTokens || this.calculateTokenBudget(budgetConfig);

    // 6. 应用Token预算裁剪
    const budgetedChunks = this.tokenBudget.fitWithinBudget(scoredChunks, maxTokens);

    // 7. 构建注入结果
    const result = this.buildInjectionResult(budgetedChunks, project, request);

    // 8. 记录元数据
    const resolveTimeMs = Date.now() - startTime;
    result.metadata.resolveTimeMs = resolveTimeMs;

    return result;
  }

  /**
   * 检测当前项目
   */
  private async detectProject(request: InjectionRequest) {
    if (request.projectId) {
      return await this.contextStore.getProject(request.projectId);
    }
    
    // 从请求的cwd检测项目
    return await this.projectDetector.detect(request.cwd);
  }

  /**
   * 对搜索结果进行评分和排序
   */
  private scoreAndRank(chunks: any[], request: InjectionRequest): ScoredChunk[] {
    return chunks
      .map(chunk => {
        let score = chunk.relevance || 0;  // 基础搜索相关性分数

        // 加权因子 1：项目匹配 +50%
        if (request.projectId && chunk.projectId === request.projectId) {
          score *= 1.5;
        }

        // 加权因子 2：时间衰减（7天内 +20%，30天内 +10%）
        try {
          const updatedAt = new Date(chunk.updatedAt);
          const ageMs = Date.now() - updatedAt.getTime();
          const ageDays = ageMs / 86400000;
          
          if (ageDays <= 7) score *= 1.2;
          else if (ageDays <= 30) score *= 1.1;
        } catch (e) {
          // 如果日期解析失败，跳过时间衰减
        }

        // 加权因子 3：类型权重
        const typeWeights: Record<string, number> = {
          "project": 1.3,      // 项目上下文优先
          "memory": 1.1,       // 记忆次之
          "session": 0.9,      // 会话摘要再次
          "user-profile": 1.0, // 用户档案基础权重
          "global": 0.8,       // 全局上下文较低权重
        };
        score *= typeWeights[chunk.type] ?? 1.0;

        return { 
          ...chunk, 
          finalScore: score 
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * 计算Token预算
   */
  private calculateTokenBudget(budgetConfig: any): number {
    const totalTokens = budgetConfig.budget_max_tokens || 4000;
    const percent = budgetConfig.budget_percent || 15;
    const maxBudget = (totalTokens * percent) / 100;
    
    return Math.min(maxBudget, totalTokens);
  }

  /**
   * 构建注入结果
   */
  private buildInjectionResult(
    chunks: ScoredChunk[], 
    project: any, 
    request: InjectionRequest
  ): InjectionResult {
    const parts: string[] = [];
    
    // 添加标题
    parts.push("## 用户上下文（由 PCL 自动注入）\n");

    // 添加项目信息
    if (project) {
      parts.push(`### 当前项目：${project.name || project.id}`);
      if (project.description) {
        parts.push(`${project.description}\n`);
      }
    }

    // 按类型分组输出
    const grouped = this.groupBy(chunks, 'type');

    if (grouped['project']) {
      parts.push("### 项目详情");
      for (const chunk of grouped['project']) {
        parts.push(chunk.content);
      }
    }

    if (grouped['memory'] && request.includeMemory !== false) {
      parts.push("\n### 相关历史决策");
      for (const chunk of grouped['memory']) {
        const dateStr = this.formatDate(chunk.updatedAt);
        parts.push(`- [${dateStr}] ${chunk.content}`);
      }
    }

    if (grouped['user-profile']) {
      parts.push("\n### 用户偏好");
      for (const chunk of grouped['user-profile']) {
        parts.push(chunk.content);
      }
    }

    if (grouped['global']) {
      parts.push("\n### 全局上下文");
      for (const chunk of grouped['global']) {
        parts.push(chunk.content);
      }
    }

    parts.push("\n---");
    parts.push("_以上上下文由 PCL 自动注入，仅供参考。_");

    const systemPrompt = parts.join("\n");
    const totalTokens = this.tokenBudget.estimateTokens(systemPrompt);

    return {
      systemPrompt,
      chunks,
      metadata: {
        totalTokens,
        projectDetected: project?.id || null,
        chunksIncluded: chunks.length,
        resolveTimeMs: 0, // Will be set by caller
      }
    };
  }

  /**
   * 按属性分组
   */
  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * 格式化日期
   */
  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN');
    } catch (e) {
      return dateStr;
    }
  }
}