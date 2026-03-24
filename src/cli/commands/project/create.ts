// src/cli/commands/project/create.ts
import chalk from 'chalk';
import { ContextStore } from '../../../core/context-store';
import { FileStore } from '../../../storage/file-store';
import { GitManager } from '../../../storage/git-manager';
import { ConfigManager } from '../../../storage/config-manager';
import { getPclHome } from '../../../utils/path-utils';

export interface CreateOptions {
  name?: string;
  description?: string;
}

export async function createCommand(id: string, options: CreateOptions = {}): Promise<void> {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize(); // 确保配置已初始化
    
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init(); // 初始化Git管理器
    
    const contextStore = new ContextStore(fileStore, gitManager);
    
    // 准备项目数据
    const projectData = {
      name: options.name || id,
      description: options.description || '',
    };
    
    // 创建项目
    await contextStore.createProject(id, projectData);
    
    // 立即提交更改
    await gitManager.commitNow(`Created project: ${id}`);
    
    console.log(chalk.green(`✅ Project "${id}" created successfully`));
    console.log(chalk.gray(`   Name: ${options.name || id}`));
    if (options.description) {
      console.log(chalk.gray(`   Description: ${options.description}`));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Failed to create project: ${(error as Error).message}`));
    throw error;
  }
}