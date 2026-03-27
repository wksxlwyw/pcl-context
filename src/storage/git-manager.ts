// src/storage/git-manager.ts
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from './config-manager.js';
import { HistoryOptions, HistoryEntry, DiffResult, RollbackOptions } from '../types/config.js';

export class GitManager {
  private git: SimpleGit;
  private commitTimer: NodeJS.Timeout | null = null;
  private pendingFiles: Set<string> = new Set();
  private enabled: boolean = true;

  constructor(private pclHome: string, private configManager: ConfigManager) {
    this.git = simpleGit(pclHome);
  }

  /**
   * 初始化 Git 仓库
   */
  async init(): Promise<void> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
        await this.writeGitignore();
        await this.git.add('.');
        await this.git.commit('[pcl] Initial setup');
      }
    } catch (error) {
      console.warn('Git not found or initialization failed. Version control disabled.');
      this.enabled = false;
    }
  }

  /**
   * 标记文件变更（防抖自动提交）
   */
  async markChanged(filePath: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const config = await this.configManager.getConfig();
      if (!config.git.auto_commit) return;

      this.pendingFiles.add(filePath);

      // 防抖：累积 5 秒后统一提交
      if (this.commitTimer) clearTimeout(this.commitTimer);
      this.commitTimer = setTimeout(
        () => this.flushCommit(),
        config.git.auto_commit_delay_ms
      );
    } catch (error) {
      console.error('Error marking file as changed:', error);
    }
  }

  /**
   * 立即提交（CLI 单次执行模式下使用）
   */
  async commitNow(message?: string): Promise<void> {
    if (!this.enabled) return;
    
    if (this.pendingFiles.size === 0) return;
    await this.flushCommit(message);
  }

  /**
   * 执行提交
   */
  private async flushCommit(customMessage?: string): Promise<void> {
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
  private generateCommitMessage(files: string[]): string {
    if (files.length === 1) {
      const file = files[0];
      if (file.includes('contexts/projects/')) {
        const project = path.basename(file, '.yaml');
        return `Updated project context: ${project}`;
      }
      if (file.includes('memories/')) return 'Added new memory entry';
      if (file.includes('sessions/')) return 'Added session summary';
      if (file === 'contexts/user-profile.yaml') return 'Updated user profile';
      return `Updated ${file}`;
    }
    return `Updated ${files.length} files`;
  }

  /**
   * 查看历史
   */
  async getHistory(options: HistoryOptions): Promise<HistoryEntry[]> {
    if (!this.enabled) return [];
    
    try {
      const logArgs: string[] = [`--max-count=${options.limit || 50}`];
      if (options.since) logArgs.push(`--since="${options.since}"`);
      if (options.path) logArgs.push('--', options.path);

      const log = await this.git.log(logArgs);
      return log.all.map(entry => ({
        hash: entry.hash.substring(0, 8),
        date: entry.date,
        message: entry.message,
        files: [], // 延迟加载
      }));
    } catch (error) {
      console.error('Error getting git history:', error);
      return [];
    }
  }

  /**
   * 对比差异（人类可读格式）
   */
  async getDiff(ref1: string, ref2: string = 'HEAD'): Promise<DiffResult> {
    if (!this.enabled) {
      return { changes: [], raw: '' };
    }
    
    try {
      const raw = await this.git.diff([ref1, ref2]);
      return this.formatDiff(raw);
    } catch (error) {
      console.error('Error getting diff:', error);
      return { changes: [], raw: '' };
    }
  }

  /**
   * 友好的 diff 格式化
   */
  private formatDiff(rawDiff: string): DiffResult {
    // 这里可以实现更友好的 diff 格式化
    // 简单起见，暂时返回原始 diff
    const changes: any[] = []; // 具体实现可根据需要扩展
    return { changes, raw: rawDiff };
  }

  /**
   * 回滚
   */
  async rollback(ref: string, options: RollbackOptions = {}): Promise<void> {
    if (!this.enabled) return;
    
    try {
      if (options.projectPath) {
        // 仅回滚特定文件
        await this.git.checkout([ref, '--', options.projectPath]);
        await this.git.add(options.projectPath);
        await this.git.commit(`[pcl] Rollback ${options.projectPath} to ${ref}`);
      } else {
        // 使用 revert 而非 reset，保留历史
        await this.git.revert(ref, { '--no-edit': null });
      }
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    }
  }

  /**
   * 创建命名快照（Git tag）
   */
  async createSnapshot(name: string): Promise<void> {
    if (!this.enabled) return;
    
    await this.flushCommit(`Snapshot: ${name}`);
    const tagName = `snapshot/${name.replace(/\s+/g, '-')}`;
    await this.git.addTag(tagName);
  }

  /**
   * .gitignore 配置
   */
  private async writeGitignore(): Promise<void> {
    const content = [
      '# PCL internal files',
      'logs/',
      '*.lock',
      '.DS_Store',
    ].join('\n');
    const gitignorePath = path.join(this.pclHome, '.gitignore');
    await fs.writeFile(gitignorePath, content, 'utf-8');
  }

  /**
   * 清理资源（在应用退出前调用）
   */
  async cleanup(): Promise<void> {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      await this.flushCommit('Cleanup commit');
    }
  }
}