// src/cli/commands/init.ts
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { getPclHome } from '../../utils/path-utils';
import { FileStore } from '../../storage/file-store';
import { ConfigManager } from '../../storage/config-manager';
import { GitManager } from '../../storage/git-manager';

const DEFAULT_CONFIG = `version: "1.0"

# 注入配置
injection:
  enabled: true
  budget_percent: 15
  budget_max_tokens: 4000
  include_user_profile: true
  include_global: true
  include_memories: true
  memory_lookback_days: 30

# 版本控制配置
git:
  auto_commit: true
  auto_commit_delay_ms: 5000
  commit_message_prefix: "[pcl]"

# 项目检测配置
project_detection:
  enabled: true
  directory_mappings:
    # "/Users/alex/projects/saas-app": "saas-app"
    # "/Users/alex/projects/blog": "blog"
  auto_detect: true

# 日志配置
logging:
  level: "info"
  inject_log: true
`;

const USER_PROFILE_TEMPLATE = `# 用户个人档案
name: ""
role: ""
skills: []
preferences: {}
output_preferences: {}
`;

const GLOBAL_CONTEXT_TEMPLATE = `# 全局通用上下文
# 在这里添加适用于所有项目的通用信息
`;

export async function initCommand(options: { force?: boolean } = {}): Promise<void> {
  const pclHome = getPclHome();
  
  if (existsSync(pclHome) && !options.force) {
    console.log(chalk.yellow("PCL 已初始化。使用 --force 重新初始化。"));
    return;
  }

  try {
    // 创建目录结构
    await mkdir(path.join(pclHome, "contexts/projects"), { recursive: true });
    await mkdir(path.join(pclHome, "memories"), { recursive: true });
    await mkdir(path.join(pclHome, "sessions"), { recursive: true });
    await mkdir(path.join(pclHome, "logs"), { recursive: true });

    // 创建默认配置
    await writeFile(path.join(pclHome, "config.yaml"), DEFAULT_CONFIG);
    await writeFile(path.join(pclHome, "contexts/user-profile.yaml"), USER_PROFILE_TEMPLATE);
    await writeFile(path.join(pclHome, "contexts/global.yaml"), GLOBAL_CONTEXT_TEMPLATE);

    // 初始化配置管理器和Git管理器
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();

    console.log(chalk.green("✅ PCL 已初始化"));
    console.log(`   目录：${pclHome}`);
    console.log(`   下一步：pcl set user.name "你的名字"`);
  } catch (error) {
    console.error(chalk.red("初始化失败:"), error);
    throw error;
  }
}