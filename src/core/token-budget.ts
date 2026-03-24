// src/core/token-budget.ts
import { ScoredChunk } from '../types/mcp';

export class TokenBudget {
  /**
   * 估算文本的Token数量
   * 使用简单的字符计数估算（不依赖 tiktoken 等重量级库）
   * 英文: ~4 chars/token; 中文: ~2 chars/token
   * 混合文本取保守估计
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    
    const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - cjkChars;
    return Math.ceil(cjkChars / 1.5 + otherChars / 4);
  }

  /**
   * 在Token预算内对上下文片段进行裁剪
   */
  fitWithinBudget(chunks: ScoredChunk[], maxTokens: number): ScoredChunk[] {
    if (!maxTokens || maxTokens <= 0) {
      return chunks;
    }

    let totalTokens = 0;
    const result: ScoredChunk[] = [];
    
    for (const chunk of chunks) {
      const tokens = this.estimateTokens(chunk.content);
      
      // 如果加上这个chunk会超过预算，就停止添加
      if (totalTokens + tokens > maxTokens) {
        break;
      }
      
      totalTokens += tokens;
      result.push(chunk);
    }
    
    return result;
  }

  /**
   * 根据预算百分比和最大Token数计算实际预算
   */
  calculateBudget(
    totalTokens: number, 
    budgetPercent: number, 
    maxTokens: number
  ): number {
    const percentBased = Math.floor(totalTokens * (budgetPercent / 100));
    return Math.min(percentBased, maxTokens);
  }

  /**
   * 检查文本是否在预算范围内
   */
  isInBudget(text: string, maxTokens: number): boolean {
    return this.estimateTokens(text) <= maxTokens;
  }
}