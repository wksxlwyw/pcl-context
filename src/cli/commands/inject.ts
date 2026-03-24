// src/cli/commands/inject.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ContextStore } from '../../core/context-store.js';
import { FileStore } from '../../storage/file-store.js';
import { ConfigManager } from '../../storage/config-manager.js';
import { GitManager } from '../../storage/git-manager.js';
import { InjectionEngine } from '../../core/injection-engine.js';
import { SearchIndex } from '../../core/search-index.js';
import { TokenBudget } from '../../core/token-budget.js';
import { getPclHome } from '../../utils/path-utils.js';

export async function injectCommand(query: string, options: any) {
  try {
    // 初始化依赖
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    
    const searchIndex = new SearchIndex();
    await searchIndex.rebuild(fileStore);
    
    const tokenBudget = new TokenBudget();
    const contextStore = new ContextStore(fileStore, gitManager);
    const injectionEngine = new InjectionEngine(contextStore, searchIndex, tokenBudget, configManager);

    // 准备注入请求
    const request = {
      query: query || '',
      projectId: options.project,
      cwd: process.cwd(),
      maxTokens: options.maxTokens || 4000,
      includeMemory: true,
    };

    if (options.dryRun) {
      console.log(chalk.blue('\n┌─────────────────────────────────────────────────┐'));
      console.log(chalk.blue('│ 注入预览                                         │'));
      console.log(chalk.blue('├─────────────────────────────────────────────────┤'));
      
      // 执行注入但不实际发送
      const result = await injectionEngine.resolve(request);
      
      console.log(chalk.blue(`│ 项目：${(result.metadata.projectDetected || '未检测到').toString()}`.padEnd(51) + chalk.blue('│')));
      console.log(chalk.blue(`│ 匹配片段：${result.metadata.chunksIncluded.toString()}`.padEnd(51) + chalk.blue('│')));
      console.log(chalk.blue(`│ 总 Token：~${result.metadata.totalTokens.toString()}`.padEnd(51) + chalk.blue('│')));
      const remainingTokens = request.maxTokens - result.metadata.totalTokens;
      console.log(chalk.blue(`│ 预算剩余：${remainingTokens} / ${request.maxTokens}`.padEnd(51) + chalk.blue('│')));
      console.log(chalk.blue(`│ 耗时：${result.metadata.resolveTimeMs}ms`.padEnd(51) + chalk.blue('│')));
      console.log(chalk.blue('├─────────────────────────────────────────────────┤'));
      
      // 显示片段信息
      if (result.chunks.length > 0) {
        result.chunks.forEach((chunk, index) => {
          const tokens = tokenBudget.estimateTokens(chunk.content);
          console.log(chalk.blue(`│ 片段 ${index + 1}：${chunk.type} (${tokens} tokens)`.padEnd(51) + '│'));
        });
      } else {
        console.log(chalk.blue('│ 未找到相关上下文片段'.padEnd(51) + '│'));
      }
      
      console.log(chalk.blue('└─────────────────────────────────────────────────┘'));
      
      if (options.verbose) {
        console.log(chalk.yellow('\n详细上下文内容：'));
        console.log(result.systemPrompt);
      }
    } else {
      // 实际执行注入（在真实环境中这会返回给AI工具）
      const result = await injectionEngine.resolve(request);
      
      // 输出注入的上下文（在真实场景中，这会被发送给AI工具）
      console.log(result.systemPrompt);
      
      if (options.verbose) {
        console.log(chalk.gray(`\n注入统计: ${result.metadata.chunksIncluded} 片段, ${result.metadata.totalTokens} tokens, ${result.metadata.resolveTimeMs}ms`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`错误: ${(error as Error).message}`));
    process.exit(1);
  }
}

// CLI注册函数
export function registerInjectCommand(program: Command) {
  program
    .command('inject [query]')
    .description('智能上下文注入')
    .option('-p, --project <id>', '项目 ID')
    .option('--dry-run', '仅预览，不执行')
    .option('--max-tokens <n>', 'Token 预算', parseInt, 4000)
    .option('-v, --verbose', '详细输出')
    .action(injectCommand);
}