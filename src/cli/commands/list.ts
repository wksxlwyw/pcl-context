// src/cli/commands/list.ts
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store';
import { FileStore } from '../../storage/file-store';
import { getPclHome } from '../../utils/path-utils';

export async function listCommand(type: string = 'projects', options: { project?: string } = {}): Promise<void> {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const contextStore = new ContextStore(fileStore);

    if (type === 'projects') {
      const projects = await contextStore.listProjects();
      
      if (projects.length === 0) {
        console.log(chalk.yellow("暂无项目"));
        return;
      }

      console.log(chalk.bold(`项目列表 (${projects.length} 个):`));
      for (const project of projects) {
        console.log(`• ${chalk.cyan(project.id)} - ${project.name || '未命名项目'}`);
        if (project.description) {
          console.log(`  ${chalk.gray(project.description)}`);
        }
        if (project.updated_at) {
          console.log(`  ${chalk.gray(`更新时间: ${new Date(project.updated_at).toLocaleDateString()}`)}`);
        }
        console.log(''); // 空行分隔
      }
    } else if (type === 'memories') {
      // TODO: 实现记忆列表功能
      console.log(chalk.yellow("记忆列表功能将在 Phase 4 实现"));
    } else {
      console.log(chalk.red(`未知类型: ${type}. 支持: projects, memories`));
    }
  } catch (error) {
    console.error(chalk.red("列出失败:"), error);
    throw error;
  }
}