// src/storage/config-manager.ts
import { FileStore } from './file-store';
import { Config } from '../types/config';

const DEFAULT_CONFIG: Config = {
  version: "1.0",
  injection: {
    enabled: true,
    budget_percent: 15,
    budget_max_tokens: 4000,
    include_user_profile: true,
    include_global: true,
    include_memories: true,
    memory_lookback_days: 30
  },
  git: {
    auto_commit: true,
    auto_commit_delay_ms: 5000,
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

export class ConfigManager {
  private readonly fileStore: FileStore;
  private configCache: Config | null = null;
  private readonly configPath = 'config.yaml';

  constructor(fileStore: FileStore) {
    this.fileStore = fileStore;
  }

  /**
   * 初始化配置，如果不存在则创建默认配置
   */
  async initialize(): Promise<void> {
    try {
      // 尝试读取现有配置
      await this.loadConfig();
    } catch (error) {
      // 如果配置文件不存在，则创建默认配置
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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
  async loadConfig(): Promise<Config> {
    try {
      const config = await this.fileStore.readYaml<Config>(this.configPath);
      this.configCache = config;
      return config;
    } catch (error) {
      // 如果配置文件损坏或不存在，返回默认配置
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw error; // 让调用者决定是否使用默认配置
      }
      console.warn('Config file corrupted, using default config:', error);
      this.configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  /**
   * 保存配置
   */
  async saveConfig(config: Config): Promise<void> {
    await this.fileStore.writeYaml(this.configPath, config);
    this.configCache = config;
  }

  /**
   * 获取配置（带缓存）
   */
  async getConfig(): Promise<Config> {
    if (this.configCache) {
      return this.configCache;
    }
    return this.loadConfig();
  }

  /**
   * 获取特定配置项的值
   */
  async get<T = any>(keyPath: string): Promise<T | undefined> {
    const config = await this.getConfig();
    return this.getNestedValue(config, keyPath) as T;
  }

  /**
   * 设置特定配置项的值
   */
  async set(keyPath: string, value: any): Promise<void> {
    const config = await this.getConfig();
    this.setNestedValue(config, keyPath, value);
    await this.saveConfig(config);
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 设置嵌套对象的值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
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
  async resetToDefault(): Promise<void> {
    await this.saveConfig(DEFAULT_CONFIG);
  }
}