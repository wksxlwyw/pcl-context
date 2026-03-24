// src/core/search-index.ts
import { FileStore } from '../storage/file-store';
import { IndexDocument, QueryFilters, SearchResult, ContextChunk } from '../types/mcp';
import * as path from 'path';

// 动态导入 flexsearch 以减少冷启动时间
let flexsearch: typeof import('flexsearch') | null = null;

export class SearchIndex {
  private index: any; // FlexSearch.Document instance
  private initialized = false;

  constructor() {
    // 初始化空索引，延迟到首次使用时加载 flexsearch
    this.index = null;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // 动态导入 flexsearch
    if (!flexsearch) {
      const flexsearchModule = await import('flexsearch');
      // 尝试不同的导入方式
      flexsearch = flexsearchModule.default || flexsearchModule;
    }

    // FlexSearch v0.7.x 的 Document API 使用方式
    this.index = new (flexsearch.Document)({
      id: 'id',
      index: ['content', 'tags', 'projectId'],
      store: ['content', 'tags', 'projectId', 'type', 'updatedAt'],
      tokenize: 'forward',   // 支持前缀匹配
      optimize: true,
    });

    this.initialized = true;
  }

  /**
   * 从文件存储重建索引（冷启动时使用）
   */
  async rebuild(fileStore: FileStore): Promise<void> {
    await this.ensureInitialized();
    
    // 清空现有索引
    this.index = new flexsearch.Document({
      document: {
        id: 'id',
        index: ['content', 'tags', 'projectId'],
        store: ['content', 'tags', 'projectId', 'type', 'updatedAt'],
      },
      tokenize: 'forward',
      resolution: 9,
    });

    // 从文件系统加载所有上下文文件并索引
    const projectFiles = await fileStore.listFiles('contexts/projects/*.yaml');
    for (const file of projectFiles) {
      try {
        // fileStore.listFiles 返回的是完整路径，所以我们需要转换为相对于 pclHome 的路径
        const relativePath = path.relative(fileStore['pclHome'], file);
        const projectData = await fileStore.readYaml<any>(relativePath);
        const id = `project_${projectData.id}`;
        const content = this.flattenObjectToString(projectData);
        
        await this.update(id, {
          id,
          projectId: projectData.id,
          content,
          type: 'project',
          tags: projectData.tags || [],
          updatedAt: projectData.updated_at || new Date().toISOString(),
        });
      } catch (error) {
        console.warn(`Failed to index project file ${file}:`, error);
      }
    }

    // 索引用户档案
    try {
      const userProfile = await fileStore.readYaml<any>('contexts/user-profile.yaml');
      if (userProfile) {
        const id = 'user_profile';
        const content = this.flattenObjectToString(userProfile);
        
        await this.update(id, {
          id,
          content,
          type: 'user-profile',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      // 用户档案可能不存在，忽略错误
    }

    // 索引全局上下文
    try {
      const globalContext = await fileStore.readYaml<any>('contexts/global.yaml');
      if (globalContext) {
        const id = 'global_context';
        const content = this.flattenObjectToString(globalContext);
        
        await this.update(id, {
          id,
          content,
          type: 'global',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      // 全局上下文可能不存在，忽略错误
    }

    // 索引记忆文件
    const memoryFiles = await fileStore.listFiles('memories/**/*.md');
    for (const file of memoryFiles) {
      try {
        // fileStore.listFiles 返回的是完整路径，所以我们需要转换为相对于 pclHome 的路径
        const relativePath = path.relative(fileStore['pclHome'], file);
        const content = await fileStore.readMd(relativePath);
        // 提取 frontmatter（如果有）
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
        let parsedContent = content;
        let metadata: any = {};

        if (frontmatterMatch) {
          try {
            metadata = (await import('js-yaml')).load(frontmatterMatch[1]) as any;
            parsedContent = frontmatterMatch[2];
          } catch (e) {
            // 如果 frontmatter 解析失败，使用全部内容
          }
        }

        const id = `memory_${file.replace(/\//g, '_').replace(/\.md$/, '')}`;
        
        await this.update(id, {
          id,
          projectId: metadata.project,
          content: parsedContent,
          type: 'memory',
          tags: metadata.tags || [],
          updatedAt: metadata.created_at || new Date().toISOString(),
        });
      } catch (error) {
        console.warn(`Failed to index memory file ${file}:`, error);
      }
    }
  }

  /**
   * 更新索引中的文档
   */
  async update(id: string, doc: IndexDocument): Promise<void> {
    await this.ensureInitialized();
    this.index.add(id, doc);
  }

  /**
   * 从索引中移除文档
   */
  async remove(id: string): Promise<void> {
    await this.ensureInitialized();
    this.index.remove(id);
  }

  /**
   * 查询索引
   */
  async query(text: string, filters?: QueryFilters): Promise<SearchResult[]> {
    await this.ensureInitialized();
    
    // 执行搜索
    const results = this.index.search(text, {
      limit: filters?.maxResults || 20,
      enrich: true, // 返回完整文档内容
    });

    // 处理搜索结果
    let allResults: SearchResult[] = [];
    
    // results 是一个包含多个字段匹配结果的数组
    for (const fieldResults of results) {
      if (fieldResults.result) {
        for (const item of fieldResults.result) {
          const doc = item.doc as IndexDocument;
          allResults.push({
            ...doc,
            relevance: item.score || 0,
          });
        }
      }
    }

    // 去重（同一个文档可能在多个字段中匹配）
    const uniqueResults = new Map<string, SearchResult>();
    for (const result of allResults) {
      if (!uniqueResults.has(result.id) || uniqueResults.get(result.id)!.relevance < result.relevance) {
        uniqueResults.set(result.id, result);
      }
    }

    allResults = Array.from(uniqueResults.values());

    // 应用过滤器
    if (filters?.projectId) {
      allResults = allResults.filter(r => r.projectId === filters.projectId);
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      allResults = allResults.filter(r => {
        const docTags = r.tags || [];
        return filters.tags!.some(tag => docTags.includes(tag));
      });
    }

    // 按相关性排序
    allResults.sort((a, b) => b.relevance - a.relevance);

    // 限制结果数量
    return allResults.slice(0, filters?.maxResults || 20);
  }

  /**
   * 将对象转换为可搜索的字符串
   */
  private flattenObjectToString(obj: any, prefix: string = ''): string {
    let result: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        continue;
      } else if (typeof value === 'string') {
        result.push(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result.push(value.toString());
      } else if (Array.isArray(value)) {
        result.push(value.map(item => 
          typeof item === 'string' ? item : this.flattenObjectToString(item)
        ).join(' '));
      } else if (typeof value === 'object') {
        result.push(this.flattenObjectToString(value, fullKey));
      }
    }
    
    return result.join(' ');
  }
}