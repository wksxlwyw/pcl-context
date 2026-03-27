import { Command } from 'commander';
import { PCL_HOME } from '../constants.js';
import { ConfigManager } from '../../storage/config-manager.js';
import { GitManager } from '../../storage/git-manager.js';

export function registerHistoryCommand(program: Command) {
  program
    .command('history')
    .description('显示 PCL 上下文变更历史')
    .option('-l, --limit <number>', '限制显示的条目数量', '50')
    .option('--since <date>', '显示指定日期之后的历史')
    .option('--path <path>', '只显示特定路径的变更历史')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager(PCL_HOME);
        const gitManager = new GitManager(PCL_HOME, configManager);
        
        // 初始化 Git 仓库（如果需要）
        await gitManager.init();
        
        const historyOptions = {
          limit: parseInt(options.limit),
          since: options.since,
          path: options.path
        };
        
        const history = await gitManager.getHistory(historyOptions);
        
        if (history.length === 0) {
          console.log('暂无变更历史记录');
          return;
        }
        
        console.log('\n📋 PCL 变更历史:');
        console.log('='.repeat(60));
        history.forEach(entry => {
          console.log(`\n📝 ${entry.message}`);
          console.log(`   🔖 ${entry.hash} | ${new Date(entry.date).toLocaleString()}`);
        });
        console.log('='.repeat(60));
        
      } catch (error) {
        console.error('❌ 获取历史记录失败:', error);
        process.exit(1);
      }
    });
}