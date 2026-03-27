import { Command } from 'commander';
import { PCL_HOME } from '../constants.js';
import { ConfigManager } from '../../storage/config-manager.js';
import { GitManager } from '../../storage/git-manager.js';

export function registerSnapshotCommand(program: Command) {
  program
    .command('snapshot')
    .description('创建 PCL 上下文的命名快照')
    .argument('<name>', '快照名称（例如："v1.0-release" 或 "project-milestone"）')
    .action(async (name) => {
      try {
        const configManager = new ConfigManager(PCL_HOME);
        const gitManager = new GitManager(PCL_HOME, configManager);
        
        // 初始化 Git 仓库（如果需要）
        await gitManager.init();
        
        // 立即提交所有待处理的变更
        await gitManager.commitNow(`Snapshot preparation: ${name}`);
        
        // 创建命名快照
        await gitManager.createSnapshot(name);
        
        console.log('✅ 快照创建成功！');
        console.log(`   📸 快照名称: ${name}`);
        console.log(`   🏷️  Git 标签: snapshot/${name.replace(/\s+/g, '-')}`);
        console.log('\n💡 提示：可以使用以下命令查看快照:');
        console.log(`   git tag -l | grep "${name}"`);
        console.log(`   pcl history --since "$(git show -s --format=%cI snapshot/${name.replace(/\s+/g, '-')})"`);
        
      } catch (error) {
        console.error('❌ 快照创建失败:', error);
        process.exit(1);
      }
    });
}