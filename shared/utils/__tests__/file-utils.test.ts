import fs from 'fs';
import path from 'path';
import {
  fileExists,
  directoryExists,
  readFile,
  writeFile,
  createDirectory,
  deleteFile,
  listFiles
} from '../file-utils';

describe('File Utils', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  const testFile = path.join(testDir, 'test.txt');

  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  describe('fileExists', () => {
    it('should return false for non-existent file', () => {
      expect(fileExists('/non/existent/file')).toBe(false);
    });

    it('should return true for existing file', () => {
      createDirectory(testDir);
      fs.writeFileSync(testFile, 'content');
      expect(fileExists(testFile)).toBe(true);
    });
  });

  describe('directoryExists', () => {
    it('should return false for non-existent directory', () => {
      expect(directoryExists('/non/existent')).toBe(false);
    });

    it('should return true for existing directory', () => {
      createDirectory(testDir);
      expect(directoryExists(testDir)).toBe(true);
    });
  });

  describe('readFile/writeFile', () => {
    it('should throw error for non-existent file', () => {
      expect(() => readFile(testFile)).toThrow('File not found');
    });

    it('should write and read file correctly', () => {
      writeFile(testFile, 'content');
      expect(readFile(testFile)).toBe('content');
    });
  });

  describe('createDirectory', () => {
    it('should create directory', () => {
      createDirectory(testDir);
      expect(directoryExists(testDir)).toBe(true);
    });

    it('should create nested directories', () => {
      const nested = path.join(testDir, 'a');
      createDirectory(nested);
      expect(directoryExists(nested)).toBe(true);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', () => {
      createDirectory(testDir);
      fs.writeFileSync(testFile, 'content');
      deleteFile(testFile);
      expect(fileExists(testFile)).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list all files', () => {
      createDirectory(testDir);
      fs.writeFileSync(path.join(testDir, 'a.txt'), '');
      const files = listFiles(testDir);
      expect(files).toContain('a.txt');
    });

    it('should filter files', () => {
      createDirectory(testDir);
      fs.writeFileSync(path.join(testDir, 'a.txt'), '');
      fs.writeFileSync(path.join(testDir, 'b.log'), '');
      expect(listFiles(testDir, f => f.endsWith('.txt'))).toEqual(['a.txt']);
    });
  });
});