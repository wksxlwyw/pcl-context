// src/cli/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { setCommand } from './commands/set';
import { getCommand } from './commands/get';
import { listCommand } from './commands/list';

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

program.parse();