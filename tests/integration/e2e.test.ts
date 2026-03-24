// tests/integration/e2e.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { ContextStore } from '../../src/core/context-store';
import { FileStore } from '../../src/storage/file-store';
import { GitManager } from '../../src/storage/git-manager';
import { ConfigManager } from '../../src/storage/config-manager';
import { createCommand } from '../../src/cli/commands/project/create';

// 创建临时目录用于测试
async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'pcl-test-'));
  return tempDir;
}

describe('End-to-End Integration Tests', () => {
  let tempDir: string;
  let contextStore: ContextStore;
  let fileStore: FileStore;
  let gitManager: GitManager;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await createTempDir();
    
    // 创建必要的目录结构
    await fs.mkdir(path.join(tempDir, 'contexts'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'contexts/projects'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'memories'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'sessions'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'logs'), { recursive: true });
    
    fileStore = new FileStore({ pclHome: tempDir });
    configManager = new ConfigManager(fileStore);
    await configManager.initialize(); // 确保配置已初始化
    gitManager = new GitManager(tempDir, configManager);
    await gitManager.init(); // 初始化Git管理器
    contextStore = new ContextStore(fileStore, gitManager);
  });

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      // 忽略清理错误
    }
  });

  it('should create project via CLI command and verify it exists', async () => {
    const projectId = 'demo-project';
    const projectName = 'Demo Project';

    // 使用createCommand函数创建项目
    await createCommand(projectId, { name: projectName });

    // 验证项目文件已创建
    const projectFilePath = path.join(tempDir, 'contexts', 'projects', `${projectId}.yaml`);
    const projectExists = await fs.access(projectFilePath).then(() => true).catch(() => false);
    expect(projectExists).toBe(true);

    // 从文件中读取并验证内容
    const projectData = await fileStore.readYaml<any>(path.join('contexts', 'projects', `${projectId}.yaml`));
    expect(projectData.id).toBe(projectId);
    expect(projectData.name).toBe(projectName);
    expect(projectData.created_at).toBeDefined();
    expect(projectData.updated_at).toBeDefined();
  });

  it('should create project automatically when setting field for non-existent project', async () => {
    const projectId = 'auto-created-project';
    const fieldPath = `projects.${projectId}.tech_stack.frontend.[]`;
    const fieldValue = 'React';

    // 设置一个不存在项目的字段，应该自动创建项目
    await contextStore.setField(fieldPath, fieldValue);

    // 验证项目已被创建
    const project = await contextStore.getProject(projectId);
    expect(project).toBeDefined();
    expect(project?.id).toBe(projectId);
    expect(project?.name).toBe(projectId); // 默认使用ID作为名称

    // 验证字段已设置
    const retrievedValue = await contextStore.getField(fieldPath);
    expect(retrievedValue).toEqual(['React']);
  });

  it('should follow complete workflow: init -> create project -> set field -> get field -> list projects', async () => {
    // 1. 创建项目
    const projectId = 'workflow-test';
    const projectName = 'Workflow Test Project';
    
    await contextStore.createProject(projectId, { name: projectName, description: 'Test project for workflow' });

    // 2. 设置项目字段
    await contextStore.setField(`projects.${projectId}.tech_stack.frontend.[]`, 'React');
    await contextStore.setField(`projects.${projectId}.tech_stack.backend.[]`, 'Node.js');

    // 3. 获取项目字段
    const frontendStack = await contextStore.getField(`projects.${projectId}.tech_stack.frontend`);
    const backendStack = await contextStore.getField(`projects.${projectId}.tech_stack.backend`);
    
    expect(frontendStack).toEqual(['React']);
    expect(backendStack).toEqual(['Node.js']);

    // 4. 获取项目名称
    const projectNameRetrieved = await contextStore.getField(`projects.${projectId}.name`);
    expect(projectNameRetrieved).toBe(projectName);

    // 5. 列出项目
    const projects = await contextStore.listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(projectId);
    expect(projects[0].name).toBe(projectName);
  });

  it('should handle GitManager initialization without errors', async () => {
    // 测试GitManager能够正确初始化而不抛出错误
    expect(gitManager).toBeDefined();
    
    // 确保getConfig方法不会返回null
    const config = await configManager.getConfig();
    expect(config).toBeDefined();
    expect(config.version).toBe('1.0');
  });
});