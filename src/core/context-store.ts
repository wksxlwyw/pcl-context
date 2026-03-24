// src/core/context-store.ts
import { FileStore } from '../storage/file-store';
import { 
  UserProfile, 
  GlobalContext, 
  ProjectContext, 
  ProjectSummary 
} from '../types/context';
import { GitManager } from '../storage/git-manager';

export class ContextStore {
  private readonly fileStore: FileStore;
  private readonly gitManager?: GitManager;

  constructor(fileStore: FileStore, gitManager?: GitManager) {
    this.fileStore = fileStore;
    this.gitManager = gitManager;
  }

  // 项目上下文 CRUD 操作
  async createProject(id: string, data: Omit<ProjectContext, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const projectData = {
      id,
      name: data.name ?? id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ProjectContext;

    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.writeYaml(filePath, projectData);
    
    // 标记文件变更以进行版本控制
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }

  async getProject(id: string): Promise<ProjectContext | null> {
    try {
      const filePath = `contexts/projects/${id}.yaml`;
      const project = await this.fileStore.readYaml<ProjectContext>(filePath);
      return project;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async updateProject(id: string, patch: Partial<ProjectContext>): Promise<void> {
    const existingProject = await this.getProject(id);
    if (!existingProject) {
      throw new Error(`Project with id '${id}' does not exist`);
    }

    const updatedProject: ProjectContext = {
      ...existingProject,
      ...patch,
      id,
      updated_at: new Date().toISOString()
    };

    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.writeYaml(filePath, updatedProject);
    
    // 标记文件变更以进行版本控制
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }

  async listProjects(): Promise<ProjectSummary[]> {
    try {
      const files = await this.fileStore.listFiles('contexts/projects/*.yaml');
      const projects: ProjectSummary[] = [];

      for (const file of files) {
        try {
          const project = await this.fileStore.readYaml<ProjectContext>(file);
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
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  async deleteProject(id: string): Promise<void> {
    const filePath = `contexts/projects/${id}.yaml`;
    await this.fileStore.delete(filePath);
    
    // 标记文件变更以进行版本控制
    if (this.gitManager) {
      await this.gitManager.markChanged(filePath);
    }
  }

  // 用户档案操作
  async getUserProfile(): Promise<UserProfile> {
    try {
      const profile = await this.fileStore.readYaml<UserProfile>('contexts/user-profile.yaml');
      return profile || {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async updateUserProfile(patch: Partial<UserProfile>): Promise<void> {
    const existingProfile = await this.getUserProfile();
    const updatedProfile: UserProfile = { ...existingProfile, ...patch };

    await this.fileStore.writeYaml('contexts/user-profile.yaml', updatedProfile);
    
    // 标记文件变更以进行版本控制
    if (this.gitManager) {
      await this.gitManager.markChanged('contexts/user-profile.yaml');
    }
  }

  // 全局上下文操作
  async getGlobalContext(): Promise<GlobalContext> {
    try {
      const context = await this.fileStore.readYaml<GlobalContext>('contexts/global.yaml');
      return context || {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async updateGlobalContext(patch: Partial<GlobalContext>): Promise<void> {
    const existingContext = await this.getGlobalContext();
    const updatedContext: GlobalContext = { ...existingContext, ...patch };

    await this.fileStore.writeYaml('contexts/global.yaml', updatedContext);
    
    // 标记文件变更以进行版本控制
    if (this.gitManager) {
      await this.gitManager.markChanged('contexts/global.yaml');
    }
  }

  // 通用上下文操作 - 设置字段值
  async setField(path: string, value: unknown): Promise<void> {
    // 解析路径，例如 'projects.saas.tech_stack.[]'
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    
    if (lastPart === '[]') {
      // 追加到数组模式
      const containerPath = parts.slice(0, -2).join('.');
      const arrayField = parts[parts.length - 2];
      
      if (containerPath === 'user') {
        // 用户档案操作
        const profile = await this.getUserProfile();
        const container = this.getNestedValue(profile, parts.slice(1, -2).join('.')) || {};
        
        if (!Array.isArray(container[arrayField])) {
          container[arrayField] = [];
        }
        container[arrayField].push(value);
        
        await this.updateUserProfile({ [parts[1]]: container });
      } else if (parts[0] === 'projects' && parts.length >= 3) {
        // 项目上下文操作
        const projectId = parts[1];
        const project = await this.getProject(projectId);
        
        if (!project) {
          throw new Error(`Project '${projectId}' does not exist`);
        }
        
        const container = this.getNestedValue(project, parts.slice(2, -2).join('.')) || {};
        
        if (!Array.isArray(container[arrayField])) {
          container[arrayField] = [];
        }
        container[arrayField].push(value);
        
        // 更新整个项目
        await this.updateProject(projectId, { [parts[2]]: container });
      }
    } else {
      // 普通字段设置
      if (parts[0] === 'user') {
        // 用户档案操作
        const profile = await this.getUserProfile();
        this.setNestedValue(profile, parts.slice(1).join('.'), value);
        await this.updateUserProfile(profile);
      } else if (parts[0] === 'projects' && parts.length >= 3) {
        // 项目上下文操作
        const projectId = parts[1];
        const project = await this.getProject(projectId);
        
        if (!project) {
          throw new Error(`Project '${projectId}' does not exist`);
        }
        
        this.setNestedValue(project, parts.slice(2).join('.'), value);
        await this.updateProject(projectId, project);
      } else if (parts[0] === 'global') {
        // 全局上下文操作
        const context = await this.getGlobalContext();
        this.setNestedValue(context, parts.slice(1).join('.'), value);
        await this.updateGlobalContext(context);
      } else {
        throw new Error(`Invalid path format: ${path}`);
      }
    }
  }

  // 通用上下文操作 - 获取字段值
  async getField(path: string): Promise<unknown> {
    const parts = path.split('.');
    
    if (parts[0] === 'user') {
      // 用户档案操作
      const profile = await this.getUserProfile();
      return this.getNestedValue(profile, parts.slice(1).join('.'));
    } else if (parts[0] === 'projects' && parts.length >= 3) {
      // 项目上下文操作
      const projectId = parts[1];
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      return this.getNestedValue(project, parts.slice(2).join('.'));
    } else if (parts[0] === 'global') {
      // 全局上下文操作
      const context = await this.getGlobalContext();
      return this.getNestedValue(context, parts.slice(1).join('.'));
    } else {
      throw new Error(`Invalid path format: ${path}`);
    }
  }

  // 辅助方法：获取嵌套值
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

  // 辅助方法：设置嵌套值
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
}