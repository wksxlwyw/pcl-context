// tests/unit/context-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextStore } from '../../src/core/context-store';
import { FileStore } from '../../src/storage/file-store';
import { GitManager } from '../../src/storage/git-manager';

// Mock FileStore 和 GitManager
vi.mock('../../src/storage/file-store');
vi.mock('../../src/storage/git-manager');

describe('ContextStore', () => {
  let contextStore: ContextStore;
  let mockFileStore: FileStore;
  let mockGitManager: GitManager;

  beforeEach(() => {
    mockFileStore = new FileStore({ pclHome: '/tmp/test' }) as any;
    mockGitManager = new GitManager('/tmp/test', null as any) as any;
    contextStore = new ContextStore(mockFileStore, mockGitManager);
  });

  it('should create a project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project',
    };

    vi.spyOn(mockFileStore, 'writeYaml').mockResolvedValue();
    vi.spyOn(mockGitManager, 'markChanged').mockResolvedValue();

    await contextStore.createProject('test-project', projectData);

    expect(mockFileStore.writeYaml).toHaveBeenCalledWith(
      'contexts/projects/test-project.yaml',
      expect.objectContaining({
        id: 'test-project',
        name: 'Test Project',
        description: 'A test project',
      })
    );
  });

  it('should get a project', async () => {
    const mockProject = {
      id: 'test-project',
      name: 'Test Project',
      description: 'A test project',
    };

    vi.spyOn(mockFileStore, 'readYaml').mockResolvedValue(mockProject);

    const result = await contextStore.getProject('test-project');

    expect(result).toEqual(mockProject);
    expect(mockFileStore.readYaml).toHaveBeenCalledWith('contexts/projects/test-project.yaml');
  });

  it('should return null for non-existent project', async () => {
    const error = new Error('File not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    
    vi.spyOn(mockFileStore, 'readYaml').mockRejectedValue(error);

    const result = await contextStore.getProject('non-existent');

    expect(result).toBeNull();
  });

  it('should update a project', async () => {
    const existingProject = {
      id: 'test-project',
      name: 'Old Name',
      description: 'Old Description',
    };

    const updateData = {
      name: 'New Name',
    };

    vi.spyOn(mockFileStore, 'readYaml').mockResolvedValue(existingProject);
    vi.spyOn(mockFileStore, 'writeYaml').mockResolvedValue();
    vi.spyOn(mockGitManager, 'markChanged').mockResolvedValue();

    await contextStore.updateProject('test-project', updateData);

    expect(mockFileStore.writeYaml).toHaveBeenCalledWith(
      'contexts/projects/test-project.yaml',
      expect.objectContaining({
        id: 'test-project',
        name: 'New Name',
        description: 'Old Description',
      })
    );
  });

  it('should fail to update non-existent project', async () => {
    const error = new Error('File not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    
    vi.spyOn(mockFileStore, 'readYaml').mockRejectedValue(error);

    await expect(contextStore.updateProject('non-existent', {})).rejects.toThrow();
  });

  it('should delete a project', async () => {
    vi.spyOn(mockFileStore, 'delete').mockResolvedValue();
    vi.spyOn(mockGitManager, 'markChanged').mockResolvedValue();

    await contextStore.deleteProject('test-project');

    expect(mockFileStore.delete).toHaveBeenCalledWith('contexts/projects/test-project.yaml');
  });

  it('should get user profile', async () => {
    const mockProfile = {
      name: 'Test User',
      role: 'Developer',
    };

    vi.spyOn(mockFileStore, 'readYaml').mockResolvedValue(mockProfile);

    const result = await contextStore.getUserProfile();

    expect(result).toEqual(mockProfile);
  });

  it('should return empty object for non-existent user profile', async () => {
    const error = new Error('File not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    
    vi.spyOn(mockFileStore, 'readYaml').mockRejectedValue(error);

    const result = await contextStore.getUserProfile();

    expect(result).toEqual({});
  });

  it('should update user profile', async () => {
    const existingProfile = {
      name: 'Old Name',
      role: 'Developer',
    };

    const updateData = {
      name: 'New Name',
    };

    vi.spyOn(mockFileStore, 'readYaml').mockResolvedValue(existingProfile);
    vi.spyOn(mockFileStore, 'writeYaml').mockResolvedValue();
    vi.spyOn(mockGitManager, 'markChanged').mockResolvedValue();

    await contextStore.updateUserProfile(updateData);

    expect(mockFileStore.writeYaml).toHaveBeenCalledWith(
      'contexts/user-profile.yaml',
      expect.objectContaining({
        name: 'New Name',
        role: 'Developer',
      })
    );
  });
});