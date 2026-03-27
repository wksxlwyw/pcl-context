import { Command } from 'commander';
import { PCL_HOME } from '../constants.js';
import { ConfigManager } from '../../storage/config-manager.js';
import { GitManager } from '../../storage/git-manager.js';

export function registerRollbackCommand(program: Command) {
  program
    .command('rollback')
    .description('安全回滚 PCL 上下文到指定版本')
    .argument('<ref>', '要回滚到的 Git 引用（commit hash, tag, 或 HEAD~n）')
    .option('--path <path>', '只回滚特定文件路径（例如：contexts/projects/my-project.yaml）')
    .option('--force', '跳过确认提示（谨慎使用）')
    .action(async (ref, options) => {
      try {
        // 安全确认
        if (!options.force) {
          console.log(`⚠️  警告：此操作将回滚到版本 ${ref}`);
          if (options.path) {
            console.log(`   📁 只影响文件: ${options.path}`);
          } else {
            console.log('   📁 影响所有上下文文件');
          }
          console.log('\n❓ 确认要继续吗？(y/N)');
          
          const readline = require('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise<string>((resolve) => {
            rl.question('', (input: string) => {
              rl.close();
              resolve(input.trim().toLowerCase());
            });
          });
          
          if (answer !== 'y' && answer !== 'yes') {
            console.log('❌ 操作已取消');
            return;
          }
        }
        
        const configManager = new ConfigManager(PCL_HOME);
        const gitManager = new GitManager(PCL_HOME, configManager);
        
        // 初始化 Git 仓库（如果需要）
        await gitManager.init();
        
        const rollbackOptions = options.path ? { projectPath: options.path } : {};
        await gitManager.rollback(ref, rollbackOptions);
        
        console.log('✅ 回滚成功！');
        if (options.path) {
          console.log(`   📁 文件 ${options.path} 已回滚到 ${ref}`);
        } else {
          console.log(`   📁 所有上下文已回滚到 ${ref}`);
        }
        
      } catch (error) {
        console.error('❌ 回滚失败:', error);
        process.exit(1);
      }
    });
}