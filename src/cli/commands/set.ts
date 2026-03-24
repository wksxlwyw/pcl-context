// src/cli/commands/set.ts
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store';
import { FileStore } from '../../storage/file-store';
import { GitManager } from '../../storage/git-manager';
import { getPclHome } from '../../utils/path-utils';

export async function setCommand(path: string, value: string, options: { project?: string } = {}): Promise<void> {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const gitManager = new GitManager(pclHome, null as any); // 临时null，实际使用时会传入正确的configManager
    const contextStore = new ContextStore(fileStore, gitManager);

    // 解析值，尝试解析为JSON，否则作为字符串
    let parsedValue: any = value;
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
      // 如果不是有效的JSON，则保持为字符串
    }

    // 如果指定了项目，调整路径
    let fullPath = path;
    if (options.project) {
      fullPath = `projects.${options.project}.${path}`;
    }

    await contextStore.setField(fullPath, parsedValue);
    
    console.log(chalk.green(`✅ 已设置 ${fullPath}`));
    
    // 立即提交更改
    await gitManager.commitNow();
  } catch (error) {
    console.error(chalk.red("设置失败:"), error);
    throw error;
  }
}