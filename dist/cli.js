#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/cli/index.ts
import { Command } from "commander";

// src/cli/commands/init.ts
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path2 from "path";
import chalk from "chalk";
import { simpleGit } from "simple-git";

// src/utils/path-utils.ts
import path from "path";
import os from "os";
function getPclHome() {
  return process.env.PCL_HOME || path.join(os.homedir(), ".pcl");
}

// src/cli/commands/init.ts
var DEFAULT_CONFIG = `version: "1.0"

# \u6CE8\u5165\u914D\u7F6E
injection:
  enabled: true
  budget_percent: 15
  budget_max_tokens: 4000
  include_user_profile: true
  include_global: true
  include_memories: true
  memory_lookback_days: 30

# \u7248\u672C\u63A7\u5236\u914D\u7F6E
git:
  auto_commit: true
  auto_commit_delay_ms: 5000
  commit_message_prefix: "[pcl]"

# \u9879\u76EE\u68C0\u6D4B\u914D\u7F6E
project_detection:
  enabled: true
  directory_mappings:
    # "/Users/alex/projects/saas-app": "saas-app"
    # "/Users/alex/projects/blog": "blog"
  auto_detect: true

# \u65E5\u5FD7\u914D\u7F6E
logging:
  level: "info"
  inject_log: true
`;
var USER_PROFILE_TEMPLATE = `# \u7528\u6237\u4E2A\u4EBA\u6863\u6848
name: ""
role: ""
skills: []
preferences: {}
output_preferences: {}
`;
var GLOBAL_CONTEXT_TEMPLATE = `# \u5168\u5C40\u901A\u7528\u4E0A\u4E0B\u6587
# \u5728\u8FD9\u91CC\u6DFB\u52A0\u9002\u7528\u4E8E\u6240\u6709\u9879\u76EE\u7684\u901A\u7528\u4FE1\u606F
`;
async function initCommand(options = {}) {
  const pclHome = getPclHome();
  if (existsSync(pclHome) && !options.force) {
    console.log(chalk.yellow("PCL \u5DF2\u521D\u59CB\u5316\u3002\u4F7F\u7528 --force \u91CD\u65B0\u521D\u59CB\u5316\u3002"));
    return;
  }
  try {
    await mkdir(path2.join(pclHome, "contexts/projects"), { recursive: true });
    await mkdir(path2.join(pclHome, "memories"), { recursive: true });
    await mkdir(path2.join(pclHome, "sessions"), { recursive: true });
    await mkdir(path2.join(pclHome, "logs"), { recursive: true });
    await writeFile(path2.join(pclHome, "config.yaml"), DEFAULT_CONFIG);
    await writeFile(path2.join(pclHome, "contexts/user-profile.yaml"), USER_PROFILE_TEMPLATE);
    await writeFile(path2.join(pclHome, "contexts/global.yaml"), GLOBAL_CONTEXT_TEMPLATE);
    const git = simpleGit(pclHome);
    await git.init();
    await git.add(".");
    await git.commit("[pcl] Initial setup");
    console.log(chalk.green("\u2705 PCL \u5DF2\u521D\u59CB\u5316"));
    console.log(`   \u76EE\u5F55\uFF1A${pclHome}`);
    console.log(`   \u4E0B\u4E00\u6B65\uFF1Apcl set user.name "\u4F60\u7684\u540D\u5B57"`);
  } catch (error) {
    console.error(chalk.red("\u521D\u59CB\u5316\u5931\u8D25:"), error);
    throw error;
  }
}

// src/cli/commands/set.ts
import chalk2 from "chalk";

// src/core/context-store.ts
var ContextStore = class {
  fileStore;
  gitManager;
  constructor(fileStore, gitManager) {
    this.fileStore = fileStore;
    this.gitManager = gitManager;
  }
  // 项目上下文 CRUD 操作
  async createProject(id, data) {
    const projectData = {
      id,
      name: data.name ?? id,
      ...data,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.writeYaml(filePath, projectData);
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }
  async getProject(id) {
    try {
      const filePath = `contexts/projects/${id}.yaml`;
      const project = await this.fileStore.readYaml(filePath);
      return project;
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  async updateProject(id, patch) {
    const existingProject = await this.getProject(id);
    if (!existingProject) {
      throw new Error(`Project with id '${id}' does not exist`);
    }
    const updatedProject = {
      ...existingProject,
      ...patch,
      id,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.writeYaml(filePath, updatedProject);
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }
  async listProjects() {
    try {
      const files = await this.fileStore.listFiles("contexts/projects/*.yaml");
      const projects = [];
      for (const file of files) {
        try {
          const project = await this.fileStore.readYaml(file);
          projects.push({
            id: project.id,
            name: project.name || project.id,
            description: project.description,
            updated_at: project.updated_at
          });
        } catch (error) {
          console.warn(`Failed to read project file ${file}:`, error);
        }
      }
      return projects;
    } catch (error) {
      console.error("Failed to list projects:", error);
      return [];
    }
  }
  async deleteProject(id) {
    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.delete(filePath);
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }
  // 用户档案操作
  async getUserProfile() {
    try {
      const profile = await this.fileStore.readYaml("contexts/user-profile.yaml");
      return profile || {};
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }
  async updateUserProfile(patch) {
    const existingProfile = await this.getUserProfile();
    const updatedProfile = { ...existingProfile, ...patch };
    await this.fileStore.writeYaml("contexts/user-profile.yaml", updatedProfile);
    if (this.gitManager) {
      await this.gitManager.markChanged("contexts/user-profile.yaml");
    }
  }
  // 全局上下文操作
  async getGlobalContext() {
    try {
      const context = await this.fileStore.readYaml("contexts/global.yaml");
      return context || {};
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }
  async updateGlobalContext(patch) {
    const existingContext = await this.getGlobalContext();
    const updatedContext = { ...existingContext, ...patch };
    await this.fileStore.writeYaml("contexts/global.yaml", updatedContext);
    if (this.gitManager) {
      await this.gitManager.markChanged("contexts/global.yaml");
    }
  }
  // 通用上下文操作 - 设置字段值
  async setField(path5, value) {
    const parts = path5.split(".");
    const lastPart = parts[parts.length - 1];
    if (lastPart === "[]") {
      const containerPath = parts.slice(0, -2).join(".");
      const arrayField = parts[parts.length - 2];
      if (containerPath === "user") {
        const profile = await this.getUserProfile();
        const container = this.getNestedValue(profile, parts.slice(1, -2).join(".")) || {};
        if (!Array.isArray(container[arrayField])) {
          container[arrayField] = [];
        }
        container[arrayField].push(value);
        await this.updateUserProfile({ [parts[1]]: container });
      } else if (parts[0] === "projects" && parts.length >= 3) {
        const projectId = parts[1];
        const project = await this.getProject(projectId);
        if (!project) {
          throw new Error(`Project '${projectId}' does not exist`);
        }
        const container = this.getNestedValue(project, parts.slice(2, -2).join(".")) || {};
        if (!Array.isArray(container[arrayField])) {
          container[arrayField] = [];
        }
        container[arrayField].push(value);
        await this.updateProject(projectId, { [parts[2]]: container });
      }
    } else {
      if (parts[0] === "user") {
        const profile = await this.getUserProfile();
        this.setNestedValue(profile, parts.slice(1).join("."), value);
        await this.updateUserProfile(profile);
      } else if (parts[0] === "projects" && parts.length >= 3) {
        const projectId = parts[1];
        const project = await this.getProject(projectId);
        if (!project) {
          throw new Error(`Project '${projectId}' does not exist`);
        }
        this.setNestedValue(project, parts.slice(2).join("."), value);
        await this.updateProject(projectId, project);
      } else if (parts[0] === "global") {
        const context = await this.getGlobalContext();
        this.setNestedValue(context, parts.slice(1).join("."), value);
        await this.updateGlobalContext(context);
      } else {
        throw new Error(`Invalid path format: ${path5}`);
      }
    }
  }
  // 通用上下文操作 - 获取字段值
  async getField(path5) {
    const parts = path5.split(".");
    if (parts[0] === "user") {
      const profile = await this.getUserProfile();
      return this.getNestedValue(profile, parts.slice(1).join("."));
    } else if (parts[0] === "projects" && parts.length >= 3) {
      const projectId = parts[1];
      const project = await this.getProject(projectId);
      if (!project) {
        return null;
      }
      return this.getNestedValue(project, parts.slice(2).join("."));
    } else if (parts[0] === "global") {
      const context = await this.getGlobalContext();
      return this.getNestedValue(context, parts.slice(1).join("."));
    } else {
      throw new Error(`Invalid path format: ${path5}`);
    }
  }
  // 辅助方法：获取嵌套值
  getNestedValue(obj, path5) {
    const parts = path5.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === void 0) {
        return void 0;
      }
      current = current[part];
    }
    return current;
  }
  // 辅助方法：设置嵌套值
  setNestedValue(obj, path5, value) {
    const parts = path5.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    const lastKey = parts[parts.length - 1];
    current[lastKey] = value;
  }
};

// src/storage/file-store.ts
import fs from "fs/promises";
import path3 from "path";
import yaml from "js-yaml";
import { glob } from "glob";
var FileStore = class {
  pclHome;
  constructor(options) {
    this.pclHome = options.pclHome;
  }
  /**
   * 读取YAML文件
   */
  async readYaml(filePath) {
    const fullPath = path3.join(this.pclHome, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return yaml.load(content);
  }
  /**
   * 写入YAML文件
   */
  async writeYaml(filePath, data) {
    const fullPath = path3.join(this.pclHome, filePath);
    const dir = path3.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    const yamlStr = yaml.dump(data, { lineWidth: -1 });
    if (Buffer.byteLength(yamlStr, "utf-8") > 100 * 1024) {
      throw new Error(`File ${filePath} exceeds 100KB size limit`);
    }
    await fs.writeFile(fullPath, yamlStr, "utf-8");
  }
  /**
   * 读取Markdown文件
   */
  async readMd(filePath) {
    const fullPath = path3.join(this.pclHome, filePath);
    return fs.readFile(fullPath, "utf-8");
  }
  /**
   * 写入Markdown文件
   */
  async writeMd(filePath, content) {
    const fullPath = path3.join(this.pclHome, filePath);
    const dir = path3.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    if (Buffer.byteLength(content, "utf-8") > 100 * 1024) {
      throw new Error(`File ${filePath} exceeds 100KB size limit`);
    }
    await fs.writeFile(fullPath, content, "utf-8");
  }
  /**
   * 检查文件是否存在
   */
  async exists(filePath) {
    try {
      await fs.access(path3.join(this.pclHome, filePath));
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 删除文件
   */
  async delete(filePath) {
    const fullPath = path3.join(this.pclHome, filePath);
    await fs.unlink(fullPath);
  }
  /**
   * 列出目录中的文件
   */
  async listFiles(pattern) {
    const fullPathPattern = path3.join(this.pclHome, pattern);
    return glob(fullPathPattern);
  }
  /**
   * 获取文件统计信息
   */
  async stat(filePath) {
    const fullPath = path3.join(this.pclHome, filePath);
    return fs.stat(fullPath);
  }
};

// src/storage/git-manager.ts
import simpleGit2 from "simple-git";
import path4 from "path";
var GitManager = class {
  constructor(pclHome, configManager) {
    this.pclHome = pclHome;
    this.configManager = configManager;
    this.git = simpleGit2(pclHome);
  }
  git;
  commitTimer = null;
  pendingFiles = /* @__PURE__ */ new Set();
  enabled = true;
  /**
   * 初始化 Git 仓库
   */
  async init() {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
        await this.writeGitignore();
        await this.git.add(".");
        await this.git.commit("[pcl] Initial setup");
      }
    } catch (error) {
      console.warn("Git not found or initialization failed. Version control disabled.");
      this.enabled = false;
    }
  }
  /**
   * 标记文件变更（防抖自动提交）
   */
  async markChanged(filePath) {
    if (!this.enabled) return;
    try {
      const config = await this.configManager.getConfig();
      if (!config.git.auto_commit) return;
      this.pendingFiles.add(filePath);
      if (this.commitTimer) clearTimeout(this.commitTimer);
      this.commitTimer = setTimeout(
        () => this.flushCommit(),
        config.git.auto_commit_delay_ms
      );
    } catch (error) {
      console.error("Error marking file as changed:", error);
    }
  }
  /**
   * 立即提交（CLI 单次执行模式下使用）
   */
  async commitNow(message) {
    if (!this.enabled) return;
    if (this.pendingFiles.size === 0) return;
    await this.flushCommit(message);
  }
  /**
   * 执行提交
   */
  async flushCommit(customMessage) {
    if (!this.enabled) return;
    const files = [...this.pendingFiles];
    this.pendingFiles.clear();
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    if (files.length === 0) return;
    await this.git.add(files);
    const message = customMessage || this.generateCommitMessage(files);
    const config = await this.configManager.getConfig();
    const prefix = config.git.commit_message_prefix;
    await this.git.commit(`${prefix} ${message}`);
  }
  /**
   * 自动生成提交消息
   */
  generateCommitMessage(files) {
    if (files.length === 1) {
      const file = files[0];
      if (file.includes("contexts/projects/")) {
        const project = path4.basename(file, ".yaml");
        return `Updated project context: ${project}`;
      }
      if (file.includes("memories/")) return "Added new memory entry";
      if (file.includes("sessions/")) return "Added session summary";
      if (file === "contexts/user-profile.yaml") return "Updated user profile";
      return `Updated ${file}`;
    }
    return `Updated ${files.length} files`;
  }
  /**
   * 查看历史
   */
  async getHistory(options) {
    if (!this.enabled) return [];
    try {
      const logArgs = [`--max-count=${options.limit || 50}`];
      if (options.since) logArgs.push(`--since="${options.since}"`);
      if (options.path) logArgs.push("--", options.path);
      const log = await this.git.log(logArgs);
      return log.all.map((entry) => ({
        hash: entry.hash.substring(0, 8),
        date: entry.date,
        message: entry.message,
        files: []
        // 延迟加载
      }));
    } catch (error) {
      console.error("Error getting git history:", error);
      return [];
    }
  }
  /**
   * 对比差异（人类可读格式）
   */
  async getDiff(ref1, ref2 = "HEAD") {
    if (!this.enabled) {
      return { changes: [], raw: "" };
    }
    try {
      const raw = await this.git.diff([ref1, ref2]);
      return this.formatDiff(raw);
    } catch (error) {
      console.error("Error getting diff:", error);
      return { changes: [], raw: "" };
    }
  }
  /**
   * 友好的 diff 格式化
   */
  formatDiff(rawDiff) {
    const changes = [];
    return { changes, raw: rawDiff };
  }
  /**
   * 回滚
   */
  async rollback(ref, options = {}) {
    if (!this.enabled) return;
    try {
      if (options.projectPath) {
        await this.git.checkout([ref, "--", options.projectPath]);
        await this.git.add(options.projectPath);
        await this.git.commit(`[pcl] Rollback ${options.projectPath} to ${ref}`);
      } else {
        await this.git.revert(ref, { "--no-edit": null });
      }
    } catch (error) {
      console.error("Error during rollback:", error);
      throw error;
    }
  }
  /**
   * 创建命名快照（Git tag）
   */
  async createSnapshot(name) {
    if (!this.enabled) return;
    await this.flushCommit(`Snapshot: ${name}`);
    const tagName = `snapshot/${name.replace(/\s+/g, "-")}`;
    await this.git.addTag(tagName);
  }
  /**
   * .gitignore 配置
   */
  async writeGitignore() {
    const content = [
      "# PCL internal files",
      "logs/",
      "*.lock",
      ".DS_Store"
    ].join("\n");
    const gitignorePath = path4.join(this.pclHome, ".gitignore");
    await __require("fs").promises.writeFile(gitignorePath, content);
  }
  /**
   * 清理资源（在应用退出前调用）
   */
  async cleanup() {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      await this.flushCommit("Cleanup commit");
    }
  }
};

// src/cli/commands/set.ts
async function setCommand(path5, value, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const gitManager = new GitManager(pclHome, null);
    const contextStore = new ContextStore(fileStore, gitManager);
    let parsedValue = value;
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
    }
    let fullPath = path5;
    if (options.project) {
      fullPath = `projects.${options.project}.${path5}`;
    }
    await contextStore.setField(fullPath, parsedValue);
    console.log(chalk2.green(`\u2705 \u5DF2\u8BBE\u7F6E ${fullPath}`));
    await gitManager.commitNow();
  } catch (error) {
    console.error(chalk2.red("\u8BBE\u7F6E\u5931\u8D25:"), error);
    throw error;
  }
}

// src/cli/commands/get.ts
import chalk3 from "chalk";
import yaml2 from "js-yaml";
async function getCommand(path5, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const contextStore = new ContextStore(fileStore);
    let fullPath = path5;
    if (options.project) {
      fullPath = `projects.${options.project}.${path5}`;
    }
    const value = await contextStore.getField(fullPath);
    if (value === void 0 || value === null) {
      console.log(chalk3.yellow(`\u26A0\uFE0F  \u672A\u627E\u5230\u8DEF\u5F84: ${fullPath}`));
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(value, null, 2));
    } else {
      if (typeof value === "object") {
        console.log(yaml2.dump(value));
      } else {
        console.log(value);
      }
    }
  } catch (error) {
    console.error(chalk3.red("\u83B7\u53D6\u5931\u8D25:"), error);
    throw error;
  }
}

// src/cli/commands/list.ts
import chalk4 from "chalk";
async function listCommand(type = "projects", options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const contextStore = new ContextStore(fileStore);
    if (type === "projects") {
      const projects = await contextStore.listProjects();
      if (projects.length === 0) {
        console.log(chalk4.yellow("\u6682\u65E0\u9879\u76EE"));
        return;
      }
      console.log(chalk4.bold(`\u9879\u76EE\u5217\u8868 (${projects.length} \u4E2A):`));
      for (const project of projects) {
        console.log(`\u2022 ${chalk4.cyan(project.id)} - ${project.name || "\u672A\u547D\u540D\u9879\u76EE"}`);
        if (project.description) {
          console.log(`  ${chalk4.gray(project.description)}`);
        }
        if (project.updated_at) {
          console.log(`  ${chalk4.gray(`\u66F4\u65B0\u65F6\u95F4: ${new Date(project.updated_at).toLocaleDateString()}`)}`);
        }
        console.log("");
      }
    } else if (type === "memories") {
      console.log(chalk4.yellow("\u8BB0\u5FC6\u5217\u8868\u529F\u80FD\u5C06\u5728 Phase 4 \u5B9E\u73B0"));
    } else {
      console.log(chalk4.red(`\u672A\u77E5\u7C7B\u578B: ${type}. \u652F\u6301: projects, memories`));
    }
  } catch (error) {
    console.error(chalk4.red("\u5217\u51FA\u5931\u8D25:"), error);
    throw error;
  }
}

// src/cli/index.ts
var program = new Command();
program.name("pcl").description("Persistent Context Layer - \u8BA9 AI \u8BB0\u4F4F\u4F60\u7684\u4E00\u5207").version("1.0.0");
program.command("init").description("\u521D\u59CB\u5316 PCL").option("--force", "\u5F3A\u5236\u91CD\u65B0\u521D\u59CB\u5316").action(initCommand);
program.command("set").description("\u8BBE\u7F6E\u4E0A\u4E0B\u6587\u5B57\u6BB5").argument("<path>", "\u5B57\u6BB5\u8DEF\u5F84 (\u4F8B\u5982: user.name \u6216 tech_stack.frontend)").argument("<value>", "\u5B57\u6BB5\u503C").option("-p, --project <id>", "\u9879\u76EE ID").action(setCommand);
program.command("get").description("\u83B7\u53D6\u4E0A\u4E0B\u6587\u5B57\u6BB5").argument("<path>", "\u5B57\u6BB5\u8DEF\u5F84").option("-p, --project <id>", "\u9879\u76EE ID").option("--json", "JSON \u683C\u5F0F\u8F93\u51FA").action(getCommand);
program.command("list").description("\u5217\u51FA\u9879\u76EE\u6216\u8BB0\u5FC6").argument("[type]", "\u7C7B\u578B (projects|memories)", "projects").option("-p, --project <id>", "\u9879\u76EE ID").action(listCommand);
program.parse();
