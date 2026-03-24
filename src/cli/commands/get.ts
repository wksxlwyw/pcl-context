// src/cli/commands/get.ts
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store';
import { FileStore } from '../../storage/file-store';
import { getPclHome } from '../../utils/path-utils';
import yaml from 'js-yaml';

export async function getCommand(path: string, options: { project?: string; json?: boolean } = {}): Promise<void> {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const contextStore = new ContextStore(fileStore);

    // 如果指定了项目，调整路径
    let fullPath = path;
    if (options.project) {
      fullPath = `projects.${options.project}.${path}`;
    }

    const value = await contextStore.getField(fullPath);
    
    if (value === undefined || value === null) {
      console.log(chalk.yellow(`⚠️  未找到路径: ${fullPath}`));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      // 对于复杂对象，使用yaml格式输出，对于简单值直接输出
      if (typeof value === 'object') {
        console.log(yaml.dump(value));
      } else {
        console.log(value);
      }
    }
  } catch (error) {
    console.error(chalk.red("获取失败:"), error);
    throw error;
  }
}