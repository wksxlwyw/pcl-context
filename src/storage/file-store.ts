// src/storage/file-store.ts
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';

export interface FileStoreOptions {
  pclHome: string;
}

export class FileStore {
  private readonly pclHome: string;

  constructor(options: FileStoreOptions) {
    this.pclHome = path.resolve(options.pclHome);
  }

  /**
   * 验证路径安全性，防止路径穿越攻击。
   * 确保解析后的路径仍在 pclHome 目录内。
   */
  private safePath(filePath: string): string {
    const resolved = path.resolve(this.pclHome, filePath);
    // 确保 resolved 在 pclHome 目录之下（或就是 pclHome 本身）
    if (!resolved.startsWith(this.pclHome + path.sep) && resolved !== this.pclHome) {
      throw new Error(`Path traversal detected: "${filePath}" resolves outside PCL home directory`);
    }
    return resolved;
  }

  /**
   * 读取YAML文件
   */
  async readYaml<T = any>(filePath: string): Promise<T> {
    const fullPath = this.safePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return yaml.load(content) as T;
  }

  /**
   * 写入YAML文件
   */
  async writeYaml(filePath: string, data: any): Promise<void> {
    const fullPath = this.safePath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // 检查数据大小
    const yamlStr = yaml.dump(data, { lineWidth: -1 });
    
    // 防止单个文件过大
    if (Buffer.byteLength(yamlStr, 'utf-8') > 100 * 1024) { // 100KB
      throw new Error(`File ${filePath} exceeds 100KB size limit`);
    }

    await fs.writeFile(fullPath, yamlStr, 'utf-8');
  }

  /**
   * 读取Markdown文件
   */
  async readMd(filePath: string): Promise<string> {
    const fullPath = this.safePath(filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * 写入Markdown文件
   */
  async writeMd(filePath: string, content: string): Promise<void> {
    const fullPath = this.safePath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // 检查内容大小
    if (Buffer.byteLength(content, 'utf-8') > 100 * 1024) { // 100KB
      throw new Error(`File ${filePath} exceeds 100KB size limit`);
    }

    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.safePath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = this.safePath(filePath);
    await fs.unlink(fullPath);
  }

  /**
   * 列出目录中的文件
   */
  async listFiles(pattern: string): Promise<string[]> {
    // glob pattern 使用 pclHome 作为 cwd，确保不会逃逸
    return glob(pattern, { cwd: this.pclHome, absolute: true });
  }

  /**
   * 获取文件统计信息
   */
  async stat(filePath: string): Promise<any> {
    const fullPath = this.safePath(filePath);
    return fs.stat(fullPath);
  }
}
