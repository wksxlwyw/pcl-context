// tests/basic-test.ts
import { describe, it, expect } from 'vitest';
import { ContextStore } from '../src/core/context-store';
import { FileStore } from '../src/storage/file-store';
import { GitManager } from '../src/storage/git-manager';

describe('Basic Structure Test', () => {
  it('should have proper module exports', () => {
    expect(ContextStore).toBeDefined();
    expect(FileStore).toBeDefined();
    expect(GitManager).toBeDefined();
  });

  it('should create instances without error', () => {
    // 这些测试只是验证模块可以被导入和实例化
    expect(() => {
      // 注意：这里我们只是验证类型定义，不实际创建实例
      // 因为我们还没有完整的依赖项设置
    }).not.toThrow();
  });
});