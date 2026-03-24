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
import path4 from "path";
import chalk from "chalk";

// src/utils/path-utils.ts
import path from "path";
import os from "os";
function getPclHome() {
  return process.env.PCL_HOME || path.join(os.homedir(), ".pcl");
}

// src/storage/file-store.ts
import fs from "fs/promises";
import path2 from "path";
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
    const fullPath = path2.join(this.pclHome, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return yaml.load(content);
  }
  /**
   * 写入YAML文件
   */
  async writeYaml(filePath, data) {
    const fullPath = path2.join(this.pclHome, filePath);
    const dir = path2.dirname(fullPath);
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
    const fullPath = path2.join(this.pclHome, filePath);
    return fs.readFile(fullPath, "utf-8");
  }
  /**
   * 写入Markdown文件
   */
  async writeMd(filePath, content) {
    const fullPath = path2.join(this.pclHome, filePath);
    const dir = path2.dirname(fullPath);
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
      await fs.access(path2.join(this.pclHome, filePath));
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 删除文件
   */
  async delete(filePath) {
    const fullPath = path2.join(this.pclHome, filePath);
    await fs.unlink(fullPath);
  }
  /**
   * 列出目录中的文件
   */
  async listFiles(pattern) {
    const fullPathPattern = path2.join(this.pclHome, pattern);
    return glob(fullPathPattern);
  }
  /**
   * 获取文件统计信息
   */
  async stat(filePath) {
    const fullPath = path2.join(this.pclHome, filePath);
    return fs.stat(fullPath);
  }
};

// src/storage/config-manager.ts
var DEFAULT_CONFIG = {
  version: "1.0",
  injection: {
    enabled: true,
    budget_percent: 15,
    budget_max_tokens: 4e3,
    include_user_profile: true,
    include_global: true,
    include_memories: true,
    memory_lookback_days: 30
  },
  git: {
    auto_commit: true,
    auto_commit_delay_ms: 5e3,
    commit_message_prefix: "[pcl]"
  },
  project_detection: {
    enabled: true,
    directory_mappings: {},
    auto_detect: true
  },
  logging: {
    level: "info",
    inject_log: true
  }
};
var ConfigManager = class {
  fileStore;
  configCache = null;
  configPath = "config.yaml";
  constructor(fileStore) {
    this.fileStore = fileStore;
  }
  /**
   * 初始化配置，如果不存在则创建默认配置
   */
  async initialize() {
    try {
      await this.loadConfig();
    } catch (error) {
      if (error.code === "ENOENT") {
        await this.saveConfig(DEFAULT_CONFIG);
        this.configCache = DEFAULT_CONFIG;
      } else {
        throw error;
      }
    }
  }
  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const config = await this.fileStore.readYaml(this.configPath);
      this.configCache = config;
      return config;
    } catch (error) {
      if (error.code === "ENOENT") {
        throw error;
      }
      console.warn("Config file corrupted, using default config:", error);
      this.configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }
  /**
   * 保存配置
   */
  async saveConfig(config) {
    await this.fileStore.writeYaml(this.configPath, config);
    this.configCache = config;
  }
  /**
   * 获取配置（带缓存）
   */
  async getConfig() {
    if (this.configCache) {
      return this.configCache;
    }
    return this.loadConfig();
  }
  /**
   * 获取特定配置项的值
   */
  async get(keyPath) {
    const config = await this.getConfig();
    return this.getNestedValue(config, keyPath);
  }
  /**
   * 设置特定配置项的值
   */
  async set(keyPath, value) {
    const config = await this.getConfig();
    this.setNestedValue(config, keyPath, value);
    await this.saveConfig(config);
  }
  /**
   * 获取嵌套对象的值
   */
  getNestedValue(obj, path6) {
    const parts = path6.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === void 0) {
        return void 0;
      }
      current = current[part];
    }
    return current;
  }
  /**
   * 设置嵌套对象的值
   */
  setNestedValue(obj, path6, value) {
    const parts = path6.split(".");
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
  /**
   * 重置为默认配置
   */
  async resetToDefault() {
    await this.saveConfig(DEFAULT_CONFIG);
  }
};

// src/storage/git-manager.ts
import simpleGit from "simple-git";
import path3 from "path";
var GitManager = class {
  constructor(pclHome, configManager) {
    this.pclHome = pclHome;
    this.configManager = configManager;
    this.git = simpleGit(pclHome);
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
        const project = path3.basename(file, ".yaml");
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
    const gitignorePath = path3.join(this.pclHome, ".gitignore");
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

// src/cli/commands/init.ts
var DEFAULT_CONFIG2 = `version: "1.0"

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
    await mkdir(path4.join(pclHome, "contexts/projects"), { recursive: true });
    await mkdir(path4.join(pclHome, "memories"), { recursive: true });
    await mkdir(path4.join(pclHome, "sessions"), { recursive: true });
    await mkdir(path4.join(pclHome, "logs"), { recursive: true });
    await writeFile(path4.join(pclHome, "config.yaml"), DEFAULT_CONFIG2);
    await writeFile(path4.join(pclHome, "contexts/user-profile.yaml"), USER_PROFILE_TEMPLATE);
    await writeFile(path4.join(pclHome, "contexts/global.yaml"), GLOBAL_CONTEXT_TEMPLATE);
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
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
      for (const filePath of files) {
        try {
          const fileName = filePath.split("/").pop()?.replace(".yaml", "");
          if (!fileName) continue;
          const project = await this.fileStore.readYaml(`contexts/projects/${fileName}.yaml`);
          projects.push({
            id: project.id,
            name: project.name || project.id,
            description: project.description,
            updated_at: project.updated_at
          });
        } catch (error) {
          console.warn(`Failed to read project file ${filePath}:`, error);
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
  async setField(path6, value) {
    const parts = path6.split(".");
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
        let project = await this.getProject(projectId);
        if (!project) {
          await this.createProject(projectId, { name: projectId });
          project = await this.getProject(projectId);
          if (!project) {
            throw new Error(`Failed to create project '${projectId}'`);
          }
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
        let project = await this.getProject(projectId);
        if (!project) {
          await this.createProject(projectId, { name: projectId });
          project = await this.getProject(projectId);
          if (!project) {
            throw new Error(`Failed to create project '${projectId}'`);
          }
        }
        this.setNestedValue(project, parts.slice(2).join("."), value);
        await this.updateProject(projectId, project);
      } else if (parts[0] === "global") {
        const context = await this.getGlobalContext();
        this.setNestedValue(context, parts.slice(1).join("."), value);
        await this.updateGlobalContext(context);
      } else {
        throw new Error(`Invalid path format: ${path6}`);
      }
    }
  }
  // 通用上下文操作 - 获取字段值
  async getField(path6) {
    const parts = path6.split(".");
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
      throw new Error(`Invalid path format: ${path6}`);
    }
  }
  // 辅助方法：获取嵌套值
  getNestedValue(obj, path6) {
    const parts = path6.split(".");
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
  setNestedValue(obj, path6, value) {
    const parts = path6.split(".");
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

// src/cli/commands/set.ts
async function setCommand(path6, value, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    const contextStore = new ContextStore(fileStore, gitManager);
    let parsedValue = value;
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
    }
    let fullPath = path6;
    if (options.project) {
      fullPath = `projects.${options.project}.${path6}`;
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
async function getCommand(path6, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const contextStore = new ContextStore(fileStore);
    let fullPath = path6;
    if (options.project) {
      fullPath = `projects.${options.project}.${path6}`;
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

// src/cli/commands/project/create.ts
import chalk5 from "chalk";
async function createCommand(id, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    const contextStore = new ContextStore(fileStore, gitManager);
    const projectData = {
      name: options.name || id,
      description: options.description || ""
    };
    await contextStore.createProject(id, projectData);
    await gitManager.commitNow(`Created project: ${id}`);
    console.log(chalk5.green(`\u2705 Project "${id}" created successfully`));
    console.log(chalk5.gray(`   Name: ${options.name || id}`));
    if (options.description) {
      console.log(chalk5.gray(`   Description: ${options.description}`));
    }
  } catch (error) {
    console.error(chalk5.red(`\u274C Failed to create project: ${error.message}`));
    throw error;
  }
}

// src/cli/commands/inject.ts
import chalk6 from "chalk";

// src/utils/project-detector.ts
import { join, basename, dirname } from "path";
import { promises as fs2 } from "fs";
var ProjectDetector = class {
  constructor(config, contextStore) {
    this.config = config;
    this.contextStore = contextStore;
  }
  /**
   * 检测当前工作目录对应的项目
   */
  async detect(cwd) {
    if (!cwd) {
      cwd = process.cwd();
    }
    const mappings = this.config.get("project_detection.directory_mappings") || {};
    for (const [dir, projectId] of Object.entries(mappings)) {
      if (cwd.startsWith(dir)) {
        const project = await this.contextStore.getProject(projectId);
        return project ? { id: projectId, name: project.name } : { id: projectId };
      }
    }
    const markerPath = await this.findUpward(cwd, ".pcl-project");
    if (markerPath) {
      try {
        const projectId = (await fs2.readFile(markerPath, "utf-8")).trim();
        const project = await this.contextStore.getProject(projectId);
        return project ? { id: projectId, name: project.name } : { id: projectId };
      } catch (error) {
        console.warn(`Failed to read .pcl-project file: ${error}`);
      }
    }
    const dirName = basename(cwd);
    const projects = await this.contextStore.listProjects();
    const match = projects.find(
      (p) => p.id === dirName || p.name && p.name.toLowerCase() === dirName.toLowerCase()
    );
    if (match) {
      return { id: match.id, name: match.name };
    }
    return null;
  }
  /**
   * 向上递归搜索文件
   */
  async findUpward(dir, fileName) {
    const fullPath = join(dir, fileName);
    try {
      await fs2.access(fullPath);
      return fullPath;
    } catch (error) {
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) {
      return null;
    }
    return this.findUpward(parentDir, fileName);
  }
};

// src/core/injection-engine.ts
var InjectionEngine = class {
  constructor(contextStore, searchIndex, tokenBudget, config) {
    this.contextStore = contextStore;
    this.searchIndex = searchIndex;
    this.tokenBudget = tokenBudget;
    this.config = config;
    this.projectDetector = new ProjectDetector(config, contextStore);
  }
  projectDetector;
  /**
   * 核心注入方法 - 根据请求智能检索并构建上下文
   */
  async resolve(request) {
    const startTime = Date.now();
    const project = await this.detectProject(request);
    const effectiveProjectId = request.projectId || project?.id;
    const query = request.query || "";
    const filters = {
      projectId: effectiveProjectId,
      tags: request.tags,
      maxResults: 20
    };
    const relevantChunks = await this.searchIndex.query(query, filters);
    const scoredChunks = this.scoreAndRank(relevantChunks, request);
    const budgetConfig = await this.config.get("injection");
    const maxTokens = request.maxTokens || this.calculateTokenBudget(budgetConfig);
    const budgetedChunks = this.tokenBudget.fitWithinBudget(scoredChunks, maxTokens);
    const result = this.buildInjectionResult(budgetedChunks, project, request);
    const resolveTimeMs = Date.now() - startTime;
    result.metadata.resolveTimeMs = resolveTimeMs;
    return result;
  }
  /**
   * 检测当前项目
   */
  async detectProject(request) {
    if (request.projectId) {
      return await this.contextStore.getProject(request.projectId);
    }
    return await this.projectDetector.detect(request.cwd);
  }
  /**
   * 对搜索结果进行评分和排序
   */
  scoreAndRank(chunks, request) {
    return chunks.map((chunk) => {
      let score = chunk.relevance || 0;
      if (request.projectId && chunk.projectId === request.projectId) {
        score *= 1.5;
      }
      try {
        const updatedAt = new Date(chunk.updatedAt);
        const ageMs = Date.now() - updatedAt.getTime();
        const ageDays = ageMs / 864e5;
        if (ageDays <= 7) score *= 1.2;
        else if (ageDays <= 30) score *= 1.1;
      } catch (e) {
      }
      const typeWeights = {
        "project": 1.3,
        // 项目上下文优先
        "memory": 1.1,
        // 记忆次之
        "session": 0.9,
        // 会话摘要再次
        "user-profile": 1,
        // 用户档案基础权重
        "global": 0.8
        // 全局上下文较低权重
      };
      score *= typeWeights[chunk.type] ?? 1;
      return {
        ...chunk,
        finalScore: score
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }
  /**
   * 计算Token预算
   */
  calculateTokenBudget(budgetConfig) {
    const totalTokens = budgetConfig.budget_max_tokens || 4e3;
    const percent = budgetConfig.budget_percent || 15;
    const maxBudget = totalTokens * percent / 100;
    return Math.min(maxBudget, totalTokens);
  }
  /**
   * 构建注入结果
   */
  buildInjectionResult(chunks, project, request) {
    const parts = [];
    parts.push("## \u7528\u6237\u4E0A\u4E0B\u6587\uFF08\u7531 PCL \u81EA\u52A8\u6CE8\u5165\uFF09\n");
    if (project) {
      parts.push(`### \u5F53\u524D\u9879\u76EE\uFF1A${project.name || project.id}`);
      if (project.description) {
        parts.push(`${project.description}
`);
      }
    }
    const grouped = this.groupBy(chunks, "type");
    if (grouped["project"]) {
      parts.push("### \u9879\u76EE\u8BE6\u60C5");
      for (const chunk of grouped["project"]) {
        parts.push(chunk.content);
      }
    }
    if (grouped["memory"] && request.includeMemory !== false) {
      parts.push("\n### \u76F8\u5173\u5386\u53F2\u51B3\u7B56");
      for (const chunk of grouped["memory"]) {
        const dateStr = this.formatDate(chunk.updatedAt);
        parts.push(`- [${dateStr}] ${chunk.content}`);
      }
    }
    if (grouped["user-profile"]) {
      parts.push("\n### \u7528\u6237\u504F\u597D");
      for (const chunk of grouped["user-profile"]) {
        parts.push(chunk.content);
      }
    }
    if (grouped["global"]) {
      parts.push("\n### \u5168\u5C40\u4E0A\u4E0B\u6587");
      for (const chunk of grouped["global"]) {
        parts.push(chunk.content);
      }
    }
    parts.push("\n---");
    parts.push("_\u4EE5\u4E0A\u4E0A\u4E0B\u6587\u7531 PCL \u81EA\u52A8\u6CE8\u5165\uFF0C\u4EC5\u4F9B\u53C2\u8003\u3002_");
    const systemPrompt = parts.join("\n");
    const totalTokens = this.tokenBudget.estimateTokens(systemPrompt);
    return {
      systemPrompt,
      chunks,
      metadata: {
        totalTokens,
        projectDetected: project?.id || null,
        chunksIncluded: chunks.length,
        resolveTimeMs: 0
        // Will be set by caller
      }
    };
  }
  /**
   * 按属性分组
   */
  groupBy(items, key) {
    return items.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }
  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("zh-CN");
    } catch (e) {
      return dateStr;
    }
  }
};

// src/core/search-index.ts
import * as path5 from "path";
var flexsearch = null;
var SearchIndex = class {
  index;
  // FlexSearch.Document instance
  initialized = false;
  constructor() {
    this.index = null;
  }
  async ensureInitialized() {
    if (this.initialized) return;
    if (!flexsearch) {
      const flexsearchModule = await import("flexsearch");
      flexsearch = flexsearchModule.default || flexsearchModule;
    }
    this.index = new flexsearch.Document({
      id: "id",
      index: ["content", "tags", "projectId"],
      store: ["content", "tags", "projectId", "type", "updatedAt"],
      tokenize: "forward",
      // 支持前缀匹配
      optimize: true
    });
    this.initialized = true;
  }
  /**
   * 从文件存储重建索引（冷启动时使用）
   */
  async rebuild(fileStore) {
    await this.ensureInitialized();
    this.index = new flexsearch.Document({
      document: {
        id: "id",
        index: ["content", "tags", "projectId"],
        store: ["content", "tags", "projectId", "type", "updatedAt"]
      },
      tokenize: "forward",
      resolution: 9
    });
    const projectFiles = await fileStore.listFiles("contexts/projects/*.yaml");
    for (const file of projectFiles) {
      try {
        const relativePath = path5.relative(fileStore["pclHome"], file);
        const projectData = await fileStore.readYaml(relativePath);
        const id = `project_${projectData.id}`;
        const content = this.flattenObjectToString(projectData);
        await this.update(id, {
          id,
          projectId: projectData.id,
          content,
          type: "project",
          tags: projectData.tags || [],
          updatedAt: projectData.updated_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        console.warn(`Failed to index project file ${file}:`, error);
      }
    }
    try {
      const userProfile = await fileStore.readYaml("contexts/user-profile.yaml");
      if (userProfile) {
        const id = "user_profile";
        const content = this.flattenObjectToString(userProfile);
        await this.update(id, {
          id,
          content,
          type: "user-profile",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (error) {
    }
    try {
      const globalContext = await fileStore.readYaml("contexts/global.yaml");
      if (globalContext) {
        const id = "global_context";
        const content = this.flattenObjectToString(globalContext);
        await this.update(id, {
          id,
          content,
          type: "global",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (error) {
    }
    const memoryFiles = await fileStore.listFiles("memories/**/*.md");
    for (const file of memoryFiles) {
      try {
        const relativePath = path5.relative(fileStore["pclHome"], file);
        const content = await fileStore.readMd(relativePath);
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
        let parsedContent = content;
        let metadata = {};
        if (frontmatterMatch) {
          try {
            metadata = (await import("js-yaml")).load(frontmatterMatch[1]);
            parsedContent = frontmatterMatch[2];
          } catch (e) {
          }
        }
        const id = `memory_${file.replace(/\//g, "_").replace(/\.md$/, "")}`;
        await this.update(id, {
          id,
          projectId: metadata.project,
          content: parsedContent,
          type: "memory",
          tags: metadata.tags || [],
          updatedAt: metadata.created_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (error) {
        console.warn(`Failed to index memory file ${file}:`, error);
      }
    }
  }
  /**
   * 更新索引中的文档
   */
  async update(id, doc) {
    await this.ensureInitialized();
    this.index.add(id, doc);
  }
  /**
   * 从索引中移除文档
   */
  async remove(id) {
    await this.ensureInitialized();
    this.index.remove(id);
  }
  /**
   * 查询索引
   */
  async query(text, filters) {
    await this.ensureInitialized();
    const results = this.index.search(text, {
      limit: filters?.maxResults || 20,
      enrich: true
      // 返回完整文档内容
    });
    let allResults = [];
    for (const fieldResults of results) {
      if (fieldResults.result) {
        for (const item of fieldResults.result) {
          const doc = item.doc;
          allResults.push({
            ...doc,
            relevance: item.score || 0
          });
        }
      }
    }
    const uniqueResults = /* @__PURE__ */ new Map();
    for (const result of allResults) {
      if (!uniqueResults.has(result.id) || uniqueResults.get(result.id).relevance < result.relevance) {
        uniqueResults.set(result.id, result);
      }
    }
    allResults = Array.from(uniqueResults.values());
    if (filters?.projectId) {
      allResults = allResults.filter((r) => r.projectId === filters.projectId);
    }
    if (filters?.tags && filters.tags.length > 0) {
      allResults = allResults.filter((r) => {
        const docTags = r.tags || [];
        return filters.tags.some((tag) => docTags.includes(tag));
      });
    }
    allResults.sort((a, b) => b.relevance - a.relevance);
    return allResults.slice(0, filters?.maxResults || 20);
  }
  /**
   * 将对象转换为可搜索的字符串
   */
  flattenObjectToString(obj, prefix = "") {
    let result = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === void 0) {
        continue;
      } else if (typeof value === "string") {
        result.push(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        result.push(value.toString());
      } else if (Array.isArray(value)) {
        result.push(value.map(
          (item) => typeof item === "string" ? item : this.flattenObjectToString(item)
        ).join(" "));
      } else if (typeof value === "object") {
        result.push(this.flattenObjectToString(value, fullKey));
      }
    }
    return result.join(" ");
  }
};

// src/core/token-budget.ts
var TokenBudget = class {
  /**
   * 估算文本的Token数量
   * 使用简单的字符计数估算（不依赖 tiktoken 等重量级库）
   * 英文: ~4 chars/token; 中文: ~2 chars/token
   * 混合文本取保守估计
   */
  estimateTokens(text) {
    if (!text) return 0;
    const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - cjkChars;
    return Math.ceil(cjkChars / 1.5 + otherChars / 4);
  }
  /**
   * 在Token预算内对上下文片段进行裁剪
   */
  fitWithinBudget(chunks, maxTokens) {
    if (!maxTokens || maxTokens <= 0) {
      return chunks;
    }
    let totalTokens = 0;
    const result = [];
    for (const chunk of chunks) {
      const tokens = this.estimateTokens(chunk.content);
      if (totalTokens + tokens > maxTokens) {
        break;
      }
      totalTokens += tokens;
      result.push(chunk);
    }
    return result;
  }
  /**
   * 根据预算百分比和最大Token数计算实际预算
   */
  calculateBudget(totalTokens, budgetPercent, maxTokens) {
    const percentBased = Math.floor(totalTokens * (budgetPercent / 100));
    return Math.min(percentBased, maxTokens);
  }
  /**
   * 检查文本是否在预算范围内
   */
  isInBudget(text, maxTokens) {
    return this.estimateTokens(text) <= maxTokens;
  }
};

// src/cli/commands/inject.ts
async function injectCommand(query, options) {
  try {
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
    const request = {
      query: query || "",
      projectId: options.project,
      cwd: process.cwd(),
      maxTokens: options.maxTokens || 4e3,
      includeMemory: true
    };
    if (options.dryRun) {
      console.log(chalk6.blue("\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"));
      console.log(chalk6.blue("\u2502 \u6CE8\u5165\u9884\u89C8                                         \u2502"));
      console.log(chalk6.blue("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"));
      const result = await injectionEngine.resolve(request);
      console.log(chalk6.blue(`\u2502 \u9879\u76EE\uFF1A${(result.metadata.projectDetected || "\u672A\u68C0\u6D4B\u5230").toString()}`.padEnd(51) + chalk6.blue("\u2502")));
      console.log(chalk6.blue(`\u2502 \u5339\u914D\u7247\u6BB5\uFF1A${result.metadata.chunksIncluded.toString()}`.padEnd(51) + chalk6.blue("\u2502")));
      console.log(chalk6.blue(`\u2502 \u603B Token\uFF1A~${result.metadata.totalTokens.toString()}`.padEnd(51) + chalk6.blue("\u2502")));
      const remainingTokens = request.maxTokens - result.metadata.totalTokens;
      console.log(chalk6.blue(`\u2502 \u9884\u7B97\u5269\u4F59\uFF1A${remainingTokens} / ${request.maxTokens}`.padEnd(51) + chalk6.blue("\u2502")));
      console.log(chalk6.blue(`\u2502 \u8017\u65F6\uFF1A${result.metadata.resolveTimeMs}ms`.padEnd(51) + chalk6.blue("\u2502")));
      console.log(chalk6.blue("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"));
      if (result.chunks.length > 0) {
        result.chunks.forEach((chunk, index) => {
          const tokens = tokenBudget.estimateTokens(chunk.content);
          console.log(chalk6.blue(`\u2502 \u7247\u6BB5 ${index + 1}\uFF1A${chunk.type} (${tokens} tokens)`.padEnd(51) + "\u2502"));
        });
      } else {
        console.log(chalk6.blue("\u2502 \u672A\u627E\u5230\u76F8\u5173\u4E0A\u4E0B\u6587\u7247\u6BB5".padEnd(51) + "\u2502"));
      }
      console.log(chalk6.blue("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
      if (options.verbose) {
        console.log(chalk6.yellow("\n\u8BE6\u7EC6\u4E0A\u4E0B\u6587\u5185\u5BB9\uFF1A"));
        console.log(result.systemPrompt);
      }
    } else {
      const result = await injectionEngine.resolve(request);
      console.log(result.systemPrompt);
      if (options.verbose) {
        console.log(chalk6.gray(`
\u6CE8\u5165\u7EDF\u8BA1: ${result.metadata.chunksIncluded} \u7247\u6BB5, ${result.metadata.totalTokens} tokens, ${result.metadata.resolveTimeMs}ms`));
      }
    }
  } catch (error) {
    console.error(chalk6.red(`\u9519\u8BEF: ${error.message}`));
    process.exit(1);
  }
}

// src/cli/commands/remember.ts
import chalk7 from "chalk";

// src/core/memory-manager.ts
import { join as join2, relative as relative2 } from "path";
import yaml3 from "js-yaml";
var MemoryManager = class {
  constructor(fileStore, searchIndex) {
    this.fileStore = fileStore;
    this.searchIndex = searchIndex;
  }
  /**
   * 保存一条记忆
   */
  async remember(text, options = {}) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const dateStr = timestamp.split("T")[0];
    const hourMinSec = timestamp.split("T")[1].substring(0, 8).replace(/:/g, "");
    const id = `mem-${dateStr}-${hourMinSec}`;
    const memoryEntry = {
      id,
      content: text,
      createdAt: timestamp,
      projectId: options.projectId,
      tags: options.tags,
      source: options.source
    };
    const yearMonth = dateStr.substring(0, 7);
    const dirPath = join2("memories", yearMonth);
    await this.fileStore.writeMd(join2(dirPath, `${id}.md`), this.formatMemoryEntry(memoryEntry));
    await this.searchIndex.update(id, {
      id,
      projectId: options.projectId,
      content: text,
      type: "memory",
      tags: options.tags || [],
      updatedAt: timestamp
    });
    return memoryEntry;
  }
  /**
   * 格式化记忆条目为Markdown格式
   */
  formatMemoryEntry(entry) {
    const frontmatter = {
      id: entry.id,
      created_at: entry.createdAt,
      project: entry.projectId,
      tags: entry.tags,
      source: entry.source
    };
    const filteredFrontmatter = Object.fromEntries(
      Object.entries(frontmatter).filter(([_, v]) => v != null)
    );
    const yamlStr = yaml3.dump(filteredFrontmatter);
    return `---
${yamlStr}---
${entry.content}`;
  }
  /**
   * 检索记忆
   */
  async recall(query = {}) {
    if (query.text) {
      const results = await this.searchIndex.query(query.text, {
        projectId: query.projectId,
        tags: query.tags,
        maxResults: query.limit || 10
      });
      const memoryResults = results.filter((r) => r.type === "memory").map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.updatedAt,
        projectId: r.projectId,
        tags: r.tags,
        source: void 0
        // 从索引中可能拿不到source
      }));
      if (query.since) {
        const sinceTime = query.since.getTime();
        return memoryResults.filter((m) => new Date(m.createdAt).getTime() >= sinceTime);
      }
      return memoryResults;
    } else {
      let allMemories = [];
      const memoryFiles = await this.fileStore.listFiles("memories/**/*.md");
      for (const file of memoryFiles) {
        try {
          const relativePath = relative2(this.fileStore["pclHome"], file);
          const content = await this.fileStore.readMd(relativePath);
          const memory = this.parseMemoryFromMarkdown(content);
          if (this.matchesQuery(memory, query)) {
            allMemories.push(memory);
          }
        } catch (error) {
          console.warn(`Failed to parse memory file ${file}:`, error);
        }
      }
      allMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (query.limit) {
        allMemories = allMemories.slice(0, query.limit);
      }
      return allMemories;
    }
  }
  /**
   * 从Markdown解析记忆条目
   */
  parseMemoryFromMarkdown(markdown) {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
    let content = markdown;
    let metadata = {};
    if (frontmatterMatch) {
      try {
        metadata = yaml3.load(frontmatterMatch[1]);
        content = frontmatterMatch[2];
      } catch (e) {
      }
    }
    return {
      id: metadata.id || "unknown",
      content: content.trim(),
      createdAt: metadata.created_at || (/* @__PURE__ */ new Date()).toISOString(),
      projectId: metadata.project,
      tags: metadata.tags,
      source: metadata.source
    };
  }
  /**
   * 检查记忆是否匹配查询条件
   */
  matchesQuery(memory, query) {
    if (query.projectId && memory.projectId !== query.projectId) {
      return false;
    }
    if (query.tags && query.tags.length > 0) {
      const memoryTags = memory.tags || [];
      if (!query.tags.some((tag) => memoryTags.includes(tag))) {
        return false;
      }
    }
    if (query.since) {
      if (new Date(memory.createdAt).getTime() < query.since.getTime()) {
        return false;
      }
    }
    return true;
  }
  /**
   * 获取近期会话摘要
   */
  async getRecentSessions(options = {}) {
    return [];
  }
  /**
   * 保存会话摘要
   */
  async saveSessionSummary(summary) {
  }
};

// src/cli/commands/remember.ts
async function rememberCommand(text, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    const searchIndex = new SearchIndex();
    await searchIndex.rebuild(fileStore);
    const memoryManager = new MemoryManager(fileStore, searchIndex);
    let tags;
    if (options.tag) {
      tags = [];
      for (const tagOption of options.tag) {
        tags.push(...tagOption.split(",").map((t) => t.trim()));
      }
    }
    const entry = await memoryManager.remember(text, {
      projectId: options.project,
      tags,
      source: options.source || "cli"
    });
    console.log(chalk7.green(`\u2705 \u5DF2\u4FDD\u5B58\u8BB0\u5FC6 [${entry.id}]`));
    console.log(chalk7.gray(`   \u5185\u5BB9: ${text.substring(0, 60)}${text.length > 60 ? "..." : ""}`));
    if (options.project) {
      console.log(chalk7.gray(`   \u9879\u76EE: ${options.project}`));
    }
    if (tags && tags.length > 0) {
      console.log(chalk7.gray(`   \u6807\u7B7E: ${tags.join(", ")}`));
    }
    await gitManager.commitNow(`[pcl] Remember: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`);
  } catch (error) {
    console.error(chalk7.red("\u4FDD\u5B58\u8BB0\u5FC6\u5931\u8D25:"), error);
    throw error;
  }
}

// src/cli/commands/recall.ts
import chalk8 from "chalk";
async function recallCommand(query, options = {}) {
  try {
    const pclHome = getPclHome();
    const fileStore = new FileStore({ pclHome });
    const configManager = new ConfigManager(fileStore);
    await configManager.initialize();
    const gitManager = new GitManager(pclHome, configManager);
    await gitManager.init();
    const searchIndex = new SearchIndex();
    await searchIndex.rebuild(fileStore);
    const memoryManager = new MemoryManager(fileStore, searchIndex);
    let sinceDate;
    if (options.since) {
      sinceDate = parseDurationToDate(options.since);
    }
    let tags;
    if (options.tag) {
      tags = [];
      for (const tagOption of options.tag) {
        tags.push(...tagOption.split(",").map((t) => t.trim()));
      }
    }
    const recallQuery = {
      text: query,
      projectId: options.project,
      tags,
      since: sinceDate,
      limit: options.limit || 10
    };
    const entries = await memoryManager.recall(recallQuery);
    if (entries.length === 0) {
      console.log(chalk8.yellow("\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u8BB0\u5FC6"));
      return;
    }
    console.log(chalk8.bold(`\u627E\u5230 ${entries.length} \u6761\u8BB0\u5FC6:`));
    console.log("");
    for (const entry of entries) {
      const dateStr = new Date(entry.createdAt).toLocaleDateString("zh-CN");
      const timeStr = new Date(entry.createdAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
      });
      console.log(chalk8.cyan(`[${dateStr} ${timeStr}]`));
      if (entry.projectId) {
        console.log(chalk8.gray(`   \u9879\u76EE: ${entry.projectId}`));
      }
      if (entry.tags && entry.tags.length > 0) {
        console.log(chalk8.gray(`   \u6807\u7B7E: ${entry.tags.join(", ")}`));
      }
      console.log(`   ${entry.content}`);
      console.log("");
    }
  } catch (error) {
    console.error(chalk8.red("\u68C0\u7D22\u8BB0\u5FC6\u5931\u8D25:"), error);
    throw error;
  }
}
function parseDurationToDate(duration) {
  const match = duration.match(/^(\d+)([dwmy])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like 7d, 30d, 1w, 3m, 1y`);
  }
  const value = parseInt(match[1]);
  const unit = match[2];
  const now = /* @__PURE__ */ new Date();
  switch (unit) {
    case "d":
      now.setDate(now.getDate() - value);
      break;
    case "w":
      now.setDate(now.getDate() - value * 7);
      break;
    case "m":
      now.setMonth(now.getMonth() - value);
      break;
    case "y":
      now.setFullYear(now.getFullYear() - value);
      break;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
  return now;
}

// src/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/utils/object-utils.ts
function pickFields(obj, paths) {
  if (!obj || typeof obj !== "object") {
    return obj;
  }
  const result = {};
  for (const path6 of paths) {
    const keys = path6.split(".");
    let current = obj;
    let target = result;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (current == null || typeof current !== "object" || !(key in current)) {
        break;
      }
      current = current[key];
      if (i < keys.length - 1) {
        if (!(key in target) || typeof target[key] !== "object") {
          target[key] = {};
        }
        target = target[key];
      } else {
        target[key] = current;
      }
    }
  }
  return result;
}

// src/mcp/tools.ts
function registerTools(server, contextStore, injectionEngine, memoryManager) {
  server.tool(
    "pcl-get-context",
    "\u83B7\u53D6\u6307\u5B9A\u9879\u76EE\u7684\u5B8C\u6574\u4E0A\u4E0B\u6587\u4FE1\u606F\uFF0C\u5305\u62EC\u6280\u672F\u6808\u3001\u67B6\u6784\u51B3\u7B56\u3001\u76EE\u6807\u7B49",
    {
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID\uFF0C\u4E0D\u6307\u5B9A\u5219\u81EA\u52A8\u68C0\u6D4B"
      },
      sections: {
        type: "array",
        items: { type: "string" },
        description: '\u8981\u83B7\u53D6\u7684\u5B57\u6BB5\uFF0C\u5982 ["tech_stack", "goals"]'
      }
    },
    async (params) => {
      try {
        const { projectId, sections } = params || {};
        const detectedProjectId = projectId;
        const context = await contextStore.getProject(detectedProjectId);
        if (!context) {
          return {
            content: [{
              type: "text",
              text: `Project '${detectedProjectId}' not found`
            }]
          };
        }
        const filteredContext = sections ? pickFields(context, sections) : context;
        const yaml4 = await import("js-yaml");
        const yamlText = yaml4.dump(filteredContext);
        return {
          content: [{ type: "text", text: yamlText }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error retrieving context: ${error.message}` }]
        };
      }
    }
  );
  server.tool(
    "pcl-inject",
    "\u6839\u636E\u5F53\u524D\u4EFB\u52A1\u81EA\u52A8\u68C0\u7D22\u5E76\u6CE8\u5165\u76F8\u5173\u4E0A\u4E0B\u6587\u3002\u5728\u5F00\u59CB\u65B0\u4EFB\u52A1\u524D\u8C03\u7528\u6B64\u5DE5\u5177\u83B7\u53D6\u80CC\u666F\u4FE1\u606F\u3002",
    {
      query: {
        type: "string",
        description: "\u5F53\u524D\u4EFB\u52A1\u63CF\u8FF0\u6216\u95EE\u9898"
      },
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID"
      },
      maxTokens: {
        type: "number",
        description: "Token \u9884\u7B97\uFF0C\u9ED8\u8BA4 4000",
        default: 4e3
      }
    },
    async (params) => {
      try {
        const { query, projectId, maxTokens = 4e3 } = params || {};
        const result = await injectionEngine.resolve({
          query,
          projectId,
          maxTokens,
          includeMemory: true
        });
        return {
          content: [{ type: "text", text: result.systemPrompt }],
          _meta: {
            resolveTimeMs: result.metadata.resolveTimeMs,
            chunksIncluded: result.metadata.chunksIncluded,
            totalTokens: result.metadata.totalTokens
          }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error during injection: ${error.message}` }]
        };
      }
    }
  );
  server.tool(
    "pcl-remember",
    "\u4FDD\u5B58\u4E00\u6761\u91CD\u8981\u4FE1\u606F\u5230\u6301\u4E45\u8BB0\u5FC6\u4E2D\uFF0C\u53EF\u5728\u672A\u6765\u7684\u5BF9\u8BDD\u4E2D\u88AB\u81EA\u52A8\u68C0\u7D22",
    {
      text: {
        type: "string",
        description: "\u8981\u8BB0\u4F4F\u7684\u5185\u5BB9"
      },
      projectId: {
        type: "string",
        description: "\u5173\u8054\u9879\u76EE ID"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "\u6807\u7B7E\u6570\u7EC4"
      }
    },
    async (params) => {
      try {
        const { text, projectId, tags } = params || {};
        const entry = await memoryManager.remember(text, {
          projectId,
          tags,
          source: "mcp-tool"
        });
        return {
          content: [{ type: "text", text: `\u2705 \u5DF2\u4FDD\u5B58\u8BB0\u5FC6 [${entry.id}]` }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error saving memory: ${error.message}` }]
        };
      }
    }
  );
  server.tool(
    "pcl-recall",
    "\u68C0\u7D22\u5386\u53F2\u8BB0\u5FC6\u548C\u51B3\u7B56\u8BB0\u5F55",
    {
      query: {
        type: "string",
        description: "\u641C\u7D22\u5173\u952E\u8BCD"
      },
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "\u6807\u7B7E\u8FC7\u6EE4"
      },
      days: {
        type: "number",
        description: "\u56DE\u6EAF\u5929\u6570\uFF0C\u9ED8\u8BA430",
        default: 30
      },
      limit: {
        type: "number",
        description: "\u7ED3\u679C\u6570\u91CF\u9650\u5236\uFF0C\u9ED8\u8BA410",
        default: 10
      }
    },
    async (params) => {
      try {
        const { query, projectId, tags, days = 30, limit = 10 } = params || {};
        const recallQuery = {
          projectId,
          tags,
          limit
        };
        if (days !== void 0) {
          const since = /* @__PURE__ */ new Date();
          since.setDate(since.getDate() - days);
          recallQuery.since = since;
        }
        if (query) {
          recallQuery.text = query;
        }
        const entries = await memoryManager.recall(recallQuery);
        if (entries.length === 0) {
          return {
            content: [{ type: "text", text: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u8BB0\u5FC6" }]
          };
        }
        const formatted = entries.map((e) => {
          const dateStr = new Date(e.createdAt).toLocaleDateString("zh-CN");
          const tagsStr = e.tags ? ` [${e.tags.join(", ")}]` : "";
          return `[${dateStr}${tagsStr}] ${e.content}`;
        }).join("\n---\n");
        return {
          content: [{ type: "text", text: formatted }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error recalling memories: ${error.message}` }]
        };
      }
    }
  );
  server.tool(
    "pcl-update-context",
    "\u66F4\u65B0\u9879\u76EE\u7684\u4E0A\u4E0B\u6587\u4FE1\u606F\uFF08\u5982\u6280\u672F\u6808\u53D8\u66F4\u3001\u65B0\u7684\u67B6\u6784\u51B3\u7B56\u7B49\uFF09",
    {
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID"
      },
      field: {
        type: "string",
        description: '\u8981\u66F4\u65B0\u7684\u5B57\u6BB5\u8DEF\u5F84\uFF0C\u5982 "tech_stack.frontend"'
      },
      value: {
        type: "string",
        description: "\u65B0\u503C\uFF08YAML \u683C\u5F0F\uFF09"
      }
    },
    async (params) => {
      try {
        const { projectId, field, value } = params || {};
        const yaml4 = await import("js-yaml");
        let parsedValue;
        try {
          parsedValue = yaml4.load(value);
        } catch (yamlError) {
          return {
            content: [{ type: "text", text: `Invalid YAML format: ${yamlError.message}` }]
          };
        }
        let project = await contextStore.getProject(projectId);
        if (!project) {
          await contextStore.createProject(projectId, { name: projectId });
          project = await contextStore.getProject(projectId);
          if (!project) {
            return {
              content: [{ type: "text", text: `Failed to create project '${projectId}'` }]
            };
          }
        }
        const updateData = {};
        updateData[field] = parsedValue;
        await contextStore.updateProject(projectId, updateData);
        return {
          content: [{ type: "text", text: `\u2705 \u5DF2\u66F4\u65B0 ${projectId}.${field}` }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error updating context: ${error.message}` }]
        };
      }
    }
  );
}

// src/mcp/resources.ts
function registerResources(server, contextStore, memoryManager) {
  server.resource(
    "user-profile",
    "pcl://contexts/user-profile",
    {
      description: "\u7528\u6237\u4E2A\u4EBA\u6863\u6848\uFF0C\u5305\u542B\u6280\u80FD\u3001\u504F\u597D\u3001\u5DE5\u4F5C\u98CE\u683C"
    },
    async () => {
      try {
        const profile = await contextStore.getUserProfile();
        const yaml4 = await import("js-yaml");
        const yamlText = yaml4.dump(profile);
        return {
          contents: [{
            uri: "pcl://contexts/user-profile",
            mimeType: "text/yaml",
            text: yamlText
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: "pcl://contexts/user-profile",
            mimeType: "text/plain",
            text: `Error loading user profile: ${error.message}`
          }]
        };
      }
    }
  );
  server.resource(
    "project-context",
    "pcl://contexts/projects/{projectId}",
    {
      description: "\u9879\u76EE\u4E0A\u4E0B\u6587\u4FE1\u606F",
      parameters: {
        projectId: {
          type: "string",
          description: "\u9879\u76EEID"
        }
      }
    },
    async (_, params) => {
      try {
        const projectId = params?.projectId;
        if (!projectId) {
          throw new Error("Missing projectId parameter");
        }
        const project = await contextStore.getProject(projectId);
        if (!project) {
          throw new Error(`Project '${projectId}' not found`);
        }
        const yaml4 = await import("js-yaml");
        const yamlText = yaml4.dump(project);
        return {
          contents: [{
            uri: `pcl://contexts/projects/${projectId}`,
            mimeType: "text/yaml",
            text: yamlText
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: `pcl://contexts/projects/${params?.projectId || "unknown"}`,
            mimeType: "text/plain",
            text: `Error loading project context: ${error.message}`
          }]
        };
      }
    }
  );
  server.resource(
    "recent-memories",
    "pcl://memories/recent",
    {
      description: "\u6700\u8FD1 7 \u5929\u7684\u8BB0\u5FC6\u6761\u76EE"
    },
    async () => {
      try {
        const since = /* @__PURE__ */ new Date();
        since.setDate(since.getDate() - 7);
        const entries = await memoryManager.recall({
          since,
          limit: 50
        });
        if (entries.length === 0) {
          return {
            contents: [{
              uri: "pcl://memories/recent",
              mimeType: "text/markdown",
              text: "\u6700\u8FD17\u5929\u6CA1\u6709\u8BB0\u5FC6\u6761\u76EE"
            }]
          };
        }
        const markdownContent = entries.map((entry) => {
          const dateStr = new Date(entry.createdAt).toLocaleDateString("zh-CN");
          const tagsStr = entry.tags && entry.tags.length > 0 ? ` (${entry.tags.join(", ")})` : "";
          return `### ${dateStr}${tagsStr}

${entry.content}

---
`;
        }).join("");
        return {
          contents: [{
            uri: "pcl://memories/recent",
            mimeType: "text/markdown",
            text: markdownContent
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: "pcl://memories/recent",
            mimeType: "text/plain",
            text: `Error loading recent memories: ${error.message}`
          }]
        };
      }
    }
  );
}

// src/mcp/prompts.ts
function registerPrompts(server, contextStore, memoryManager) {
  server.prompt(
    "project-briefing",
    "\u4E3A AI \u751F\u6210\u5F53\u524D\u9879\u76EE\u7684\u5B8C\u6574\u7B80\u62A5\uFF0C\u5E2E\u52A9 AI \u5FEB\u901F\u4E86\u89E3\u9879\u76EE\u80CC\u666F",
    {
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID"
      }
    },
    async (params) => {
      try {
        const { projectId } = params || {};
        const project = await contextStore.getProject(projectId);
        const userProfile = await contextStore.getUserProfile();
        if (!project) {
          return {
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: `\u9879\u76EE '${projectId}' \u4E0D\u5B58\u5728\u3002`
              }
            }]
          };
        }
        let briefing = `# ${project.name || projectId} \u9879\u76EE\u7B80\u62A5

`;
        if (project.description) {
          briefing += `## \u9879\u76EE\u7B80\u4ECB
${project.description}

`;
        }
        if (project.tech_stack) {
          briefing += "## \u6280\u672F\u6808\n";
          if (project.tech_stack.frontend) {
            briefing += `- \u524D\u7AEF: ${project.tech_stack.frontend.join(", ")}
`;
          }
          if (project.tech_stack.backend) {
            briefing += `- \u540E\u7AEF: ${project.tech_stack.backend.join(", ")}
`;
          }
          if (project.tech_stack.infrastructure) {
            briefing += `- \u57FA\u7840\u8BBE\u65BD: ${project.tech_stack.infrastructure.join(", ")}
`;
          }
          briefing += "\n";
        }
        if (project.architecture) {
          briefing += "## \u67B6\u6784\u51B3\u7B56\n";
          if (project.architecture.pattern) {
            briefing += `- \u6A21\u5F0F: ${project.architecture.pattern}
`;
          }
          if (project.architecture.api_style) {
            briefing += `- API \u98CE\u683C: ${project.architecture.api_style}
`;
          }
          if (project.architecture.auth) {
            briefing += `- \u8BA4\u8BC1: ${project.architecture.auth}
`;
          }
          briefing += "\n";
        }
        if (project.goals && project.goals.length > 0) {
          briefing += "## \u9879\u76EE\u76EE\u6807\n";
          for (const goal of project.goals) {
            briefing += `- ${goal}
`;
          }
          briefing += "\n";
        }
        if (project.constraints && project.constraints.length > 0) {
          briefing += "## \u9879\u76EE\u7EA6\u675F\n";
          for (const constraint of project.constraints) {
            briefing += `- ${constraint}
`;
          }
          briefing += "\n";
        }
        if (userProfile && Object.keys(userProfile).length > 0) {
          briefing += "## \u7528\u6237\u504F\u597D\n";
          if (userProfile.role) {
            briefing += `- \u89D2\u8272: ${userProfile.role}
`;
          }
          if (userProfile.communication_style) {
            briefing += `- \u6C9F\u901A\u98CE\u683C: ${userProfile.communication_style}
`;
          }
          if (userProfile.code_style) {
            briefing += `- \u4EE3\u7801\u98CE\u683C: ${userProfile.code_style}
`;
          }
          briefing += "\n";
        }
        briefing += "---\n";
        briefing += "_\u4EE5\u4E0A\u4FE1\u606F\u7531 PCL \u4ECE\u9879\u76EE\u4E0A\u4E0B\u6587\u4E2D\u81EA\u52A8\u63D0\u53D6_";
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: briefing
            }
          }]
        };
      } catch (error) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `\u751F\u6210\u9879\u76EE\u7B80\u62A5\u65F6\u51FA\u9519: ${error.message}`
            }
          }]
        };
      }
    }
  );
  server.prompt(
    "code-review-context",
    "\u4E3A\u4EE3\u7801\u5BA1\u67E5\u6CE8\u5165\u9879\u76EE\u67B6\u6784\u51B3\u7B56\u548C\u7F16\u7801\u89C4\u8303",
    {
      projectId: {
        type: "string",
        description: "\u9879\u76EE ID"
      }
    },
    async (params) => {
      try {
        const { projectId } = params || {};
        const project = await contextStore.getProject(projectId);
        if (!project) {
          return {
            messages: [{
              role: "user",
              content: {
                type: "text",
                text: `\u9879\u76EE '${projectId}' \u4E0D\u5B58\u5728\u3002`
              }
            }]
          };
        }
        let context = `# ${project.name || projectId} \u4EE3\u7801\u5BA1\u67E5\u4E0A\u4E0B\u6587

`;
        if (project.tech_stack) {
          context += "## \u6280\u672F\u6808\u89C4\u8303\n";
          if (project.tech_stack.frontend) {
            context += `- \u524D\u7AEF\u6846\u67B6: ${project.tech_stack.frontend.join(", ")}
`;
          }
          if (project.tech_stack.backend) {
            context += `- \u540E\u7AEF\u6280\u672F: ${project.tech_stack.backend.join(", ")}
`;
          }
          context += "\n";
        }
        if (project.architecture) {
          context += "## \u67B6\u6784\u51B3\u7B56\n";
          if (project.architecture.pattern) {
            context += `- \u67B6\u6784\u6A21\u5F0F: ${project.architecture.pattern}
`;
          }
          if (project.architecture.api_style) {
            context += `- API \u98CE\u683C: ${project.architecture.api_style}
`;
          }
          if (project.architecture.auth) {
            context += `- \u8BA4\u8BC1\u65B9\u5F0F: ${project.architecture.auth}
`;
          }
          context += "\n";
        }
        const architectureDecisions = await memoryManager.recall({
          projectId,
          tags: ["architecture", "coding-standard", "decision", "pattern"],
          limit: 10
        });
        if (architectureDecisions.length > 0) {
          context += "## \u91CD\u8981\u67B6\u6784\u51B3\u7B56\n";
          for (const decision of architectureDecisions) {
            const dateStr = new Date(decision.createdAt).toLocaleDateString("zh-CN");
            context += `- [${dateStr}] ${decision.content}
`;
          }
          context += "\n";
        }
        const userProfile = await contextStore.getUserProfile();
        if (userProfile.code_style) {
          context += `## \u7528\u6237\u7F16\u7801\u504F\u597D
- ${userProfile.code_style}

`;
        }
        context += "---\n";
        context += "_\u4EE5\u4E0A\u4EE3\u7801\u5BA1\u67E5\u4E0A\u4E0B\u6587\u7531 PCL \u4ECE\u9879\u76EE\u4E0A\u4E0B\u6587\u548C\u5386\u53F2\u51B3\u7B56\u4E2D\u81EA\u52A8\u63D0\u53D6_";
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: context
            }
          }]
        };
      } catch (error) {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `\u751F\u6210\u4EE3\u7801\u5BA1\u67E5\u4E0A\u4E0B\u6587\u65F6\u51FA\u9519: ${error.message}`
            }
          }]
        };
      }
    }
  );
}

// src/mcp/server.ts
async function startMcpServer() {
  try {
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
    const memoryManager = new MemoryManager(fileStore, searchIndex);
    const server = new McpServer({
      name: "pcl",
      version: "1.0.0",
      description: "Persistent Context Layer - \u8BA9 AI \u8BB0\u4F4F\u4F60\u7684\u4E00\u5207"
    });
    registerResources(server, contextStore, memoryManager);
    registerTools(server, contextStore, injectionEngine, memoryManager);
    registerPrompts(server, contextStore, memoryManager);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[PCL MCP Server] Server started successfully");
    return new Promise(() => {
    });
  } catch (error) {
    console.error("[PCL MCP Server] Fatal error:", error);
    process.exit(1);
  }
}

// src/cli/index.ts
var program = new Command();
program.name("pcl").description("Persistent Context Layer - \u8BA9 AI \u8BB0\u4F4F\u4F60\u7684\u4E00\u5207").version("1.0.0");
program.command("init").description("\u521D\u59CB\u5316 PCL").option("--force", "\u5F3A\u5236\u91CD\u65B0\u521D\u59CB\u5316").action(initCommand);
program.command("set").description("\u8BBE\u7F6E\u4E0A\u4E0B\u6587\u5B57\u6BB5").argument("<path>", "\u5B57\u6BB5\u8DEF\u5F84 (\u4F8B\u5982: user.name \u6216 tech_stack.frontend)").argument("<value>", "\u5B57\u6BB5\u503C").option("-p, --project <id>", "\u9879\u76EE ID").action(setCommand);
program.command("get").description("\u83B7\u53D6\u4E0A\u4E0B\u6587\u5B57\u6BB5").argument("<path>", "\u5B57\u6BB5\u8DEF\u5F84").option("-p, --project <id>", "\u9879\u76EE ID").option("--json", "JSON \u683C\u5F0F\u8F93\u51FA").action(getCommand);
program.command("list").description("\u5217\u51FA\u9879\u76EE\u6216\u8BB0\u5FC6").argument("[type]", "\u7C7B\u578B (projects|memories)", "projects").option("-p, --project <id>", "\u9879\u76EE ID").action(listCommand);
program.command("inject").description("\u667A\u80FD\u4E0A\u4E0B\u6587\u6CE8\u5165").argument("[query]", "\u67E5\u8BE2/\u4EFB\u52A1\u63CF\u8FF0").option("-p, --project <id>", "\u9879\u76EE ID").option("--dry-run", "\u4EC5\u9884\u89C8\uFF0C\u4E0D\u6267\u884C").option("--max-tokens <n>", "Token \u9884\u7B97", parseInt, 4e3).action(injectCommand);
program.command("remember").description("\u4FDD\u5B58\u4E00\u6761\u8BB0\u5FC6").argument("<text>", "\u8981\u8BB0\u4F4F\u7684\u5185\u5BB9").option("-p, --project <id>", "\u5173\u8054\u9879\u76EE").option("--tag <tags>", "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09", (val, prev) => {
  const values = Array.isArray(prev) ? prev : [];
  values.push(val);
  return values;
}).option("--source <tool>", "\u6765\u6E90\u5DE5\u5177").action(rememberCommand);
program.command("recall").description("\u68C0\u7D22\u8BB0\u5FC6").argument("[query]", "\u641C\u7D22\u5173\u952E\u8BCD").option("-p, --project <id>", "\u9879\u76EE\u8FC7\u6EE4").option("--tag <tags>", "\u6807\u7B7E\u8FC7\u6EE4", (val, prev) => {
  const values = Array.isArray(prev) ? prev : [];
  values.push(val);
  return values;
}).option("--since <duration>", "\u65F6\u95F4\u8303\u56F4\uFF08\u5982 7d, 30d\uFF09").option("--limit <n>", "\u7ED3\u679C\u6570\u91CF", parseInt, 10).action(recallCommand);
var projectCommand = program.command("project").description("\u9879\u76EE\u7BA1\u7406\u547D\u4EE4");
projectCommand.command("create").description("\u521B\u5EFA\u65B0\u9879\u76EE").argument("<id>", "\u9879\u76EEID").option("--name <name>", "\u9879\u76EE\u540D\u79F0").option("--description <description>", "\u9879\u76EE\u63CF\u8FF0").action(createCommand);
program.command("mcp").description("\u542F\u52A8 MCP Server\uFF08stdio \u6A21\u5F0F\uFF09").action(startMcpServer);
program.parse();
