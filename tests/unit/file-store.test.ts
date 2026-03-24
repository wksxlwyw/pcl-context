// tests/unit/file-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStore } from '../../src/storage/file-store';

// 简单的模拟实现
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
  };
});

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((filePath) => filePath.split('/').slice(0, -1).join('/')),
  };
});

vi.mock('js-yaml', async () => {
  const actual = await vi.importActual('js-yaml');
  return {
    ...actual,
    load: vi.fn(),
    dump: vi.fn(),
  };
});

vi.mock('glob', async () => {
  const actual = await vi.importActual('glob');
  return {
    ...actual,
    glob: vi.fn(),
  };
});

describe('FileStore', () => {
  let fileStore: FileStore;
  const mockPclHome = '/tmp/test-pcl';

  beforeEach(() => {
    vi.clearAllMocks();
    fileStore = new FileStore({ pclHome: mockPclHome });
  });

  it('should read YAML file', async () => {
    const mockYamlContent = 'name: Test\nvalue: 123';
    const mockParsedData = { name: 'Test', value: 123 };
    
    const fsPromises = await import('fs/promises');
    const yaml = await import('js-yaml');
    
    vi.mocked(fsPromises.readFile).mockResolvedValue(mockYamlContent);
    vi.mocked(yaml.load).mockReturnValue(mockParsedData);

    const result = await fileStore.readYaml('test.yaml');

    expect(result).toEqual(mockParsedData);
    expect(fsPromises.readFile).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`, 'utf-8');
    expect(yaml.load).toHaveBeenCalledWith(mockYamlContent);
  });

  it('should write YAML file', async () => {
    const testData = { name: 'Test', value: 123 };
    const expectedYaml = 'name: Test\nvalue: 123\n'; // js-yaml adds trailing newline
    
    const fsPromises = await import('fs/promises');
    const yaml = await import('js-yaml');
    const pathModule = await import('path');
    
    vi.mocked(fsPromises.mkdir).mockResolvedValue();
    vi.mocked(fsPromises.writeFile).mockResolvedValue();
    vi.mocked(yaml.dump).mockReturnValue(expectedYaml);
    vi.mocked(pathModule.join).mockImplementation((...args) => args.join('/'));

    await fileStore.writeYaml('test.yaml', testData);

    expect(fsPromises.mkdir).toHaveBeenCalledWith(`${mockPclHome}`, { recursive: true });
    expect(yaml.dump).toHaveBeenCalledWith(testData, { lineWidth: -1 });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`, expectedYaml, 'utf-8');
  });

  it('should throw error for oversized YAML file', async () => {
    const largeData = { data: 'x'.repeat(101 * 1024) }; // >100KB
    const largeYamlString = 'x'.repeat(101 * 1024);
    
    const yaml = await import('js-yaml');
    vi.mocked(yaml.dump).mockReturnValue(largeYamlString);

    await expect(fileStore.writeYaml('test.yaml', largeData)).rejects.toThrow('exceeds 100KB size limit');
  });

  it('should read Markdown file', async () => {
    const mockMdContent = '# Test\nThis is a test.';
    
    const fsPromises = await import('fs/promises');
    vi.mocked(fsPromises.readFile).mockResolvedValue(mockMdContent);

    const result = await fileStore.readMd('test.md');

    expect(result).toBe(mockMdContent);
    expect(fsPromises.readFile).toHaveBeenCalledWith(`${mockPclHome}/test.md`, 'utf-8');
  });

  it('should write Markdown file', async () => {
    const content = '# Test\nThis is a test.';
    
    const fsPromises = await import('fs/promises');
    const pathModule = await import('path');
    
    vi.mocked(fsPromises.mkdir).mockResolvedValue();
    vi.mocked(fsPromises.writeFile).mockResolvedValue();
    vi.mocked(pathModule.join).mockImplementation((...args) => args.join('/'));

    await fileStore.writeMd('test.md', content);

    expect(fsPromises.mkdir).toHaveBeenCalledWith(`${mockPclHome}`, { recursive: true });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${mockPclHome}/test.md`, content, 'utf-8');
  });

  it('should check if file exists', async () => {
    const fsPromises = await import('fs/promises');
    vi.mocked(fsPromises.access).mockResolvedValue();

    const result = await fileStore.exists('test.yaml');

    expect(result).toBe(true);
    expect(fsPromises.access).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`);
  });

  it('should return false if file does not exist', async () => {
    const error = new Error('File not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    
    const fsPromises = await import('fs/promises');
    vi.mocked(fsPromises.access).mockRejectedValue(error);

    const result = await fileStore.exists('test.yaml');

    expect(result).toBe(false);
  });

  it('should delete a file', async () => {
    const fsPromises = await import('fs/promises');
    vi.mocked(fsPromises.unlink).mockResolvedValue();

    await fileStore.delete('test.yaml');

    expect(fsPromises.unlink).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`);
  });
});