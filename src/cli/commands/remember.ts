// src/cli/commands/remember.ts
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store';
import { FileStore } from '../../storage/file-store';
import { ConfigManager } from '../../storage/config-manager';
import { GitManager } from '../../storage/git-manager';
import { MemoryManager } from '../../core/memory-manager';
import { SearchIndex } from '../../core/search-index';
import { getPclHome } from '../../utils/path-utils';

export interface RememberOptions {
  project?: string;
  tag?: string[];
  source?: string;
}

export async function rememberCommand(text: string, options: RememberOptions = {}): Promise<void> {
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

    // 解析标签（逗号分隔）
    let tags: string[] | undefined;
    if (options.tag) {
      tags = [];
      for (const tagOption of options.tag) {
        tags.push(...tagOption.split(',').map(t => t.trim()));
      }
    }

    // 保存记忆
    const entry = await memoryManager.remember(text, {
      projectId: options.project,
      tags,
      source: options.source || 'cli',
    });

    console.log(chalk.green(`✅ 已保存记忆 [${entry.id}]`));
    console.log(chalk.gray(`   内容: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`));
    if (options.project) {
      console.log(chalk.gray(`   项目: ${options.project}`));
    }
    if (tags && tags.length > 0) {
      console.log(chalk.gray(`   标签: ${tags.join(', ')}`));
    }
    
    // 立即提交更改
    await gitManager.commitNow(`[pcl] Remember: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
  } catch (error) {
    console.error(chalk.red("保存记忆失败:"), error);
    throw error;
  }
}