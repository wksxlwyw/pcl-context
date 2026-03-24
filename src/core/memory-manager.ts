// src/core/memory-manager.ts
import { FileStore } from '../storage/file-store';
import { SearchIndex } from './search-index';
import { MemoryEntry, RememberOptions, RecallQuery } from '../types/mcp';
import { join, relative } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import yaml from 'js-yaml';

export class MemoryManager {
  constructor(
    private fileStore: FileStore,
    private searchIndex: SearchIndex
  ) {}

  /**
   * 保存一条记忆
   */
  async remember(text: string, options: RememberOptions = {}): Promise<MemoryEntry> {
    // 生成唯一ID
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
    const hourMinSec = timestamp.split('T')[1].substring(0, 8).replace(/:/g, '');
    const id = `mem-${dateStr}-${hourMinSec}`;
    
    // 构建记忆条目
    const memoryEntry: MemoryEntry = {
      id,
      content: text,
      createdAt: timestamp,
      projectId: options.projectId,
      tags: options.tags,
      source: options.source,
    };

    // 生成文件路径
    const yearMonth = dateStr.substring(0, 7); // YYYY-MM
    const dirPath = join('memories', yearMonth);
    
    // 确保目录存在
    await this.fileStore.writeMd(join(dirPath, `${id}.md`), this.formatMemoryEntry(memoryEntry));

    // 更新索引
    await this.searchIndex.update(id, {
      id,
      projectId: options.projectId,
      content: text,
      type: 'memory',
      tags: options.tags || [],
      updatedAt: timestamp,
    });

    return memoryEntry;
  }

  /**
   * 格式化记忆条目为Markdown格式
   */
  private formatMemoryEntry(entry: MemoryEntry): string {
    const frontmatter = {
      id: entry.id,
      created_at: entry.createdAt,
      project: entry.projectId,
      tags: entry.tags,
      source: entry.source,
    };

    // 过滤掉undefined/null值
    const filteredFrontmatter = Object.fromEntries(
      Object.entries(frontmatter).filter(([_, v]) => v != null)
    );

    const yamlStr = yaml.dump(filteredFrontmatter);
    
    return `---
${yamlStr}---
${entry.content}`;
  }

  /**
   * 检索记忆
   */
  async recall(query: RecallQuery = {}): Promise<MemoryEntry[]> {
    // 如果有文本查询，使用搜索引擎
    if (query.text) {
      const results = await this.searchIndex.query(query.text, {
        projectId: query.projectId,
        tags: query.tags,
        maxResults: query.limit || 10,
      });

      // 过滤出记忆类型的条目
      const memoryResults = results
        .filter(r => r.type === 'memory')
        .map(r => ({
          id: r.id,
          content: r.content,
          createdAt: r.updatedAt,
          projectId: r.projectId,
          tags: r.tags,
          source: undefined, // 从索引中可能拿不到source
        }));

      // 如果设置了时间范围，进一步过滤
      if (query.since) {
        const sinceTime = query.since.getTime();
        return memoryResults.filter(m => new Date(m.createdAt).getTime() >= sinceTime);
      }

      return memoryResults;
    } else {
      // 如果没有文本查询，只根据过滤条件检索
      let allMemories: MemoryEntry[] = [];
      
      // 读取所有记忆文件
      const memoryFiles = await this.fileStore.listFiles('memories/**/*.md');
      
      for (const file of memoryFiles) {
        try {
          // fileStore.listFiles 返回完整路径，需要转换为相对路径
          const relativePath = relative(this.fileStore['pclHome'], file);
          const content = await this.fileStore.readMd(relativePath);
          const memory = this.parseMemoryFromMarkdown(content);
          
          // 应用过滤器
          if (this.matchesQuery(memory, query)) {
            allMemories.push(memory);
          }
        } catch (error) {
          console.warn(`Failed to parse memory file ${file}:`, error);
        }
      }
      
      // 按时间倒序排列
      allMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // 应用限制
      if (query.limit) {
        allMemories = allMemories.slice(0, query.limit);
      }
      
      return allMemories;
    }
  }

  /**
   * 从Markdown解析记忆条目
   */
  private parseMemoryFromMarkdown(markdown: string): MemoryEntry {
    // 尝试解析frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
    let content = markdown;
    let metadata: any = {};

    if (frontmatterMatch) {
      try {
        metadata = yaml.load(frontmatterMatch[1]) as any;
        content = frontmatterMatch[2];
      } catch (e) {
        // 如果frontmatter解析失败，使用全部内容
      }
    }

    return {
      id: metadata.id || 'unknown',
      content: content.trim(),
      createdAt: metadata.created_at || new Date().toISOString(),
      projectId: metadata.project,
      tags: metadata.tags,
      source: metadata.source,
    };
  }

  /**
   * 检查记忆是否匹配查询条件
   */
  private matchesQuery(memory: MemoryEntry, query: RecallQuery): boolean {
    // 项目过滤
    if (query.projectId && memory.projectId !== query.projectId) {
      return false;
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      const memoryTags = memory.tags || [];
      if (!query.tags.some(tag => memoryTags.includes(tag))) {
        return false;
      }
    }

    // 时间过滤
    if (query.since) {
      if (new Date(memory.createdAt).getTime() < query.since.getTime()) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取近期会话摘要
   */
  async getRecentSessions(options: { projectId?: string; limit?: number } = {}): Promise<any[]> {
    // TODO: 实现会话摘要功能
    return [];
  }

  /**
   * 保存会话摘要
   */
  async saveSessionSummary(summary: any): Promise<void> {
    // TODO: 实现会话摘要保存功能
  }
}