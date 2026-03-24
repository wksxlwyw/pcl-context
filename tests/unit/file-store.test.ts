// tests/unit/file-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStore } from '../../src/storage/file-store';

// Mock外部依赖
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockAccess = vi.fn();
const mockUnlink = vi.fn();
const mockJoin = vi.fn();
const mockDirname = vi.fn();
const mockYamlLoad = vi.fn();
const mockYamlDump = vi.fn();

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  access: mockAccess,
  unlink: mockUnlink,
}));

vi.mock('path', () => ({
  join: mockJoin,
  dirname: mockDirname,
}));

vi.mock('js-yaml', () => ({
  load: mockYamlLoad,
  dump: mockYamlDump,
}));

describe('FileStore', () => {
  let fileStore: FileStore;
  const mockPclHome = '/tmp/test-pcl';

  beforeEach(() => {
    vi.clearAllMocks();
    fileStore = new FileStore({ pclHome: mockPclHome });
    
    // 设置path.join的默认行为
    mockJoin.mockImplementation((...args) => args.join('/'));
    mockDirname.mockImplementation((filePath) => filePath.split('/').slice(0, -1).join('/'));
  });

  it('should read YAML file', async () => {
    const mockYamlContent = 'name: Test\nvalue: 123';
    const mockParsedData = { name: 'Test', value: 123 };
    
    mockReadFile.mockResolvedValue(mockYamlContent);
    mockYamlLoad.mockReturnValue(mockParsedData);

    const result = await fileStore.readYaml('test.yaml');

    expect(result).toEqual(mockParsedData);
    expect(mockReadFile).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`, 'utf-8');
    expect(mockYamlLoad).toHaveBeenCalledWith(mockYamlContent);
  });

  it('should write YAML file', async () => {
    const testData = { name: 'Test', value: 123 };
    const expectedYaml = 'name: Test\nvalue: 123\n'; // js-yaml adds trailing newline
    
    mockMkdir.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockYamlDump.mockReturnValue(expectedYaml);

    await fileStore.writeYaml('test.yaml', testData);

    expect(mockMkdir).toHaveBeenCalledWith(`${mockPclHome}`, { recursive: true });
    expect(mockYamlDump).toHaveBeenCalledWith(testData, { lineWidth: -1 });
    expect(mockWriteFile).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`, expectedYaml, 'utf-8');
  });

  it('should throw error for oversized YAML file', async () => {
    const largeData = { data: 'x'.repeat(101 * 1024) }; // >100KB
    const largeYamlString = 'x'.repeat(101 * 1024);
    
    mockYamlDump.mockReturnValue(largeYamlString);

    await expect(fileStore.writeYaml('test.yaml', largeData)).rejects.toThrow('exceeds 100KB size limit');
  });

  it('should read Markdown file', async () => {
    const mockMdContent = '# Test\nThis is a test.';
    
    mockReadFile.mockResolvedValue(mockMdContent);

    const result = await fileStore.readMd('test.md');

    expect(result).toBe(mockMdContent);
    expect(mockReadFile).toHaveBeenCalledWith(`${mockPclHome}/test.md`, 'utf-8');
  });

  it('should write Markdown file', async () => {
    const content = '# Test\nThis is a test.';
    
    mockMkdir.mockResolvedValue();
    mockWriteFile.mockResolvedValue();

    await fileStore.writeMd('test.md', content);

    expect(mockMkdir).toHaveBeenCalledWith(`${mockPclHome}`, { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith(`${mockPclHome}/test.md`, content, 'utf-8');
  });

  it('should check if file exists', async () => {
    mockAccess.mockResolvedValue();

    const result = await fileStore.exists('test.yaml');

    expect(result).toBe(true);
    expect(mockAccess).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`);
  });

  it('should return false if file does not exist', async () => {
    const error = new Error('File not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    
    mockAccess.mockRejectedValue(error);

    const result = await fileStore.exists('test.yaml');

    expect(result).toBe(false);
  });

  it('should delete a file', async () => {
    mockUnlink.mockResolvedValue();

    await fileStore.delete('test.yaml');

    expect(mockUnlink).toHaveBeenCalledWith(`${mockPclHome}/test.yaml`);
  });
});