// src/cli/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { setCommand } from './commands/set';
import { getCommand } from './commands/get';
import { listCommand } from './commands/list';
import { createCommand } from './commands/project/create';
import { injectCommand } from './commands/inject';
import { rememberCommand } from './commands/remember';
import { recallCommand } from './commands/recall';
import { startMcpServer } from '../mcp/server';

const program = new Command();

program
  .name("pcl")
  .description("Persistent Context Layer - 让 AI 记住你的一切")
  .version("1.0.0");

program
  .command("init")
  .description("初始化 PCL")
  .option("--force", "强制重新初始化")
  .action(initCommand);

program
  .command("set")
  .description("设置上下文字段")
  .argument("<path>", "字段路径 (例如: user.name 或 tech_stack.frontend)")
  .argument("<value>", "字段值")
  .option("-p, --project <id>", "项目 ID")
  .action(setCommand);

program
  .command("get")
  .description("获取上下文字段")
  .argument("<path>", "字段路径")
  .option("-p, --project <id>", "项目 ID")
  .option("--json", "JSON 格式输出")
  .action(getCommand);

program
  .command("list")
  .description("列出项目或记忆")
  .argument("[type]", "类型 (projects|memories)", "projects")
  .option("-p, --project <id>", "项目 ID")
  .action(listCommand);

program
  .command("inject")
  .description("智能上下文注入")
  .argument("[query]", "查询/任务描述")
  .option("-p, --project <id>", "项目 ID")
  .option("--dry-run", "仅预览，不执行")
  .option("--max-tokens <n>", "Token 预算", parseInt, 4000)
  .action(injectCommand);

program
  .command("remember")
  .description("保存一条记忆")
  .argument("<text>", "要记住的内容")
  .option("-p, --project <id>", "关联项目")
  .option("--tag <tags>", "标签（逗号分隔）", (val, prev) => {
    const values = Array.isArray(prev) ? prev : [];
    values.push(val);
    return values;
  })
  .option("--source <tool>", "来源工具")
  .action(rememberCommand);

program
  .command("recall")
  .description("检索记忆")
  .argument("[query]", "搜索关键词")
  .option("-p, --project <id>", "项目过滤")
  .option("--tag <tags>", "标签过滤", (val, prev) => {
    const values = Array.isArray(prev) ? prev : [];
    values.push(val);
    return values;
  })
  .option("--since <duration>", "时间范围（如 7d, 30d）")
  .option("--limit <n>", "结果数量", parseInt, 10)
  .action(recallCommand);

// 项目子命令
const projectCommand = program
  .command("project")
  .description("项目管理命令");

projectCommand
  .command("create")
  .description("创建新项目")
  .argument("<id>", "项目ID")
  .option("--name <name>", "项目名称")
  .option("--description <description>", "项目描述")
  .action(createCommand);

// MCP Server 命令
program
  .command("mcp")
  .description("启动 MCP Server（stdio 模式）")
  .action(startMcpServer);

program.parse();