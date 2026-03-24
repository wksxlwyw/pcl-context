// src/cli/commands/recall.ts
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store';
import { FileStore } from '../../storage/file-store';
import { ConfigManager } from '../../storage/config-manager';
import { GitManager } from '../../storage/git-manager';
import { MemoryManager } from '../../core/memory-manager';
import { SearchIndex } from '../../core/search-index';
import { getPclHome } from '../../utils/path-utils';

export interface RecallOptions {
  project?: string;
  tag?: string[];
  since?: string; // duration like "7d", "30d"
  limit?: number;
}

export async function recallCommand(query?: string, options: RecallOptions = {}): Promise<void> {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    
    const searchIndex = new SearchIndex();
    await searchIndex.rebuild(fileStore);
    
    const memoryManager = new MemoryManager(fileStore, searchIndex);

    // 解析时间范围
    let sinceDate: Date | undefined;
    if (options.since) {
      sinceDate = parseDurationToDate(options.since);
    }

    // 解析标签
    let tags: string[] | undefined;
    if (options.tag) {
      tags = [];
      for (const tagOption of options.tag) {
        tags.push(...tagOption.split(',').map(t => t.trim()));
      }
    }

    // 构建查询
    const recallQuery = {
      text: query,
      projectId: options.project,
      tags,
      since: sinceDate,
      limit: options.limit || 10,
    };

    // 检索记忆
    const entries = await memoryManager.recall(recallQuery);

    if (entries.length === 0) {
      console.log(chalk.yellow("没有找到匹配的记忆"));
      return;
    }

    console.log(chalk.bold(`找到 ${entries.length} 条记忆:`));
    console.log('');

    for (const entry of entries) {
      const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN');
      const timeStr = new Date(entry.createdAt).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      console.log(chalk.cyan(`[${dateStr} ${timeStr}]`));
      
      if (entry.projectId) {
        console.log(chalk.gray(`   项目: ${entry.projectId}`));
      }
      
      if (entry.tags && entry.tags.length > 0) {
        console.log(chalk.gray(`   标签: ${entry.tags.join(', ')}`));
      }
      
      console.log(`   ${entry.content}`);
      console.log('');
    }
  } catch (error) {
    console.error(chalk.red("检索记忆失败:"), error);
    throw error;
  }
}

// 解析持续时间到日期
function parseDurationToDate(duration: string): Date {
  const match = duration.match(/^(\d+)([dwmy])$/); // d=天, w=周, m=月, y=年
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like 7d, 30d, 1w, 3m, 1y`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  
  const now = new Date();
  switch (unit) {
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    case 'w':
      now.setDate(now.getDate() - value * 7);
      break;
    case 'm':
      now.setMonth(now.getMonth() - value);
      break;
    case 'y':
      now.setFullYear(now.getFullYear() - value);
      break;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
  
  return now;
}