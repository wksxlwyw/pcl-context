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
    this.pclHome = options.pclHome;
  }

  /**
   * 读取YAML文件
   */
  async readYaml<T = any>(filePath: string): Promise<T> {
    const fullPath = path.join(this.pclHome, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return yaml.load(content) as T;
  }

  /**
   * 写入YAML文件
   */
  async writeYaml(filePath: string, data: any): Promise<void> {
    // 确保目录存在
    const fullPath = path.join(this.pclHome, filePath);
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
    const fullPath = path.join(this.pclHome, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * 写入Markdown文件
   */
  async writeMd(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.pclHome, filePath);
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
      await fs.access(path.join(this.pclHome, filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.pclHome, filePath);
    await fs.unlink(fullPath);
  }

  /**
   * 列出目录中的文件
   */
  async listFiles(pattern: string): Promise<string[]> {
    const fullPathPattern = path.join(this.pclHome, pattern);
    return glob(fullPathPattern);
  }

  /**
   * 获取文件统计信息
   */
  async stat(filePath: string): Promise<any> {
    const fullPath = path.join(this.pclHome, filePath);
    return fs.stat(fullPath);
  }
}