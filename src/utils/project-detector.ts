// src/utils/project-detector.ts
import { ConfigManager } from '../storage/config-manager';
import { ContextStore } from '../core/context-store';
import { join, basename, dirname } from 'path';
import { promises as fs } from 'fs';

export class ProjectDetector {
  constructor(
    private config: ConfigManager,
    private contextStore: ContextStore
  ) {}

  /**
   * 检测当前工作目录对应的项目
   */
  async detect(cwd?: string): Promise<{ id: string; name?: string } | null> {
    if (!cwd) {
      cwd = process.cwd();
    }

    // 策略 1：检查目录映射（最高优先级）
    const mappings = this.config.get('project_detection.directory_mappings') || {};
    for (const [dir, projectId] of Object.entries(mappings)) {
      if (cwd.startsWith(dir as string)) {
        const project = await this.contextStore.getProject(projectId as string);
        return project ? { id: projectId as string, name: project.name } : { id: projectId as string };
      }
    }

    // 策略 2：查找 .pcl-project 标记文件（向上递归搜索）
    const markerPath = await this.findUpward(cwd, '.pcl-project');
    if (markerPath) {
      try {
        const projectId = (await fs.readFile(markerPath, 'utf-8')).trim();
        const project = await this.contextStore.getProject(projectId);
        return project ? { id: projectId, name: project.name } : { id: projectId };
      } catch (error) {
        console.warn(`Failed to read .pcl-project file: ${error}`);
      }
    }

    // 策略 3：匹配项目目录名
    const dirName = basename(cwd);
    const projects = await this.contextStore.listProjects();
    const match = projects.find(p => 
      p.id === dirName || 
      (p.name && p.name.toLowerCase() === dirName.toLowerCase())
    );
    
    if (match) {
      return { id: match.id, name: match.name };
    }

    return null;
  }

  /**
   * 向上递归搜索文件
   */
  private async findUpward(dir: string, fileName: string): Promise<string | null> {
    const fullPath = join(dir, fileName);
    
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch (error) {
      // 文件不存在，继续向上搜索
    }

    const parentDir = dirname(dir);
    
    // 如果到达根目录，停止搜索
    if (parentDir === dir) {
      return null;
    }

    return this.findUpward(parentDir, fileName);
  }
}