import { Command } from 'commander';
import { PCL_HOME } from '../constants.js';
import { ConfigManager } from '../../storage/config-manager.js';
import { GitManager } from '../../storage/git-manager.js';

export function registerDiffCommand(program: Command) {
  program
    .command('diff')
    .description('显示 PCL 上下文的差异对比')
    .argument('[ref1]', '比较的起始引用（默认为 HEAD~1）')
    .argument('[ref2]', '比较的结束引用（默认为 HEAD）')
    .option('--raw', '显示原始 diff 输出')
    .action(async (ref1 = 'HEAD~1', ref2 = 'HEAD', options) => {
      try {
        const configManager = new ConfigManager(PCL_HOME);
        const gitManager = new GitManager(PCL_HOME, configManager);
        
        // 初始化 Git 仓库（如果需要）
        await gitManager.init();
        
        const diffResult = await gitManager.getDiff(ref1, ref2);
        
        if (!options.raw) {
          console.log('\n🔍 差异对比分析:');
          console.log('='.repeat(60));
          
          if (diffResult.changes.length > 0) {
            // 如果实现了友好的格式化，这里会显示结构化的变更
            console.log('结构化变更分析功能将在后续版本中实现');
            console.log('');
          }
          
          console.log('原始 diff 输出:');
          console.log('-'.repeat(40));
        }
        
        if (diffResult.raw) {
          console.log(diffResult.raw);
        } else {
          console.log('暂无差异');
        }
        
      } catch (error) {
        console.error('❌ 获取差异对比失败:', error);
        process.exit(1);
      }
    });
}