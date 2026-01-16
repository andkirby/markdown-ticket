import path from 'node:path'
import {
  buildConfigFilePath,
  buildRegistryFilePath,
  getBaseName,
  getDirName,
  isAbsolutePath,
  joinPaths,
  normalizePath,
  resolvePath,
} from '../path-resolver'

describe('path Resolver', () => {
  describe('joinPaths', () => {
    it('should join path segments', () => {
      expect(joinPaths('a', 'b', 'c')).toBe(path.join('a', 'b', 'c'))
    })
  })

  describe('resolvePath', () => {
    it('should resolve to absolute path with target', () => {
      expect(resolvePath('/base', 'target')).toBe(path.resolve('/base', 'target'))
    })

    it('should resolve base path only when no target', () => {
      expect(resolvePath('/base')).toBe(path.resolve('/base'))
    })
  })

  describe('getBaseName', () => {
    it('should return base name of path', () => {
      expect(getBaseName('/path/to/file.txt')).toBe('file.txt')
      expect(getBaseName('dir')).toBe('dir')
    })
  })

  describe('getDirName', () => {
    it('should return parent directory name', () => {
      expect(getDirName('/path/to/file.txt')).toBe('/path/to')
      expect(getDirName('/path/to/dir/')).toBe('/path/to')
      expect(getDirName('/path/to/dir')).toBe('/path/to')
    })
  })

  describe('isAbsolutePath', () => {
    it('should identify absolute paths', () => {
      expect(isAbsolutePath('/absolute/path')).toBe(true)
      expect(isAbsolutePath('relative/path')).toBe(false)
    })
  })

  describe('normalizePath', () => {
    it('should normalize path with .. and .', () => {
      expect(normalizePath('a/b/../c')).toBe(path.join('a', 'c'))
      expect(normalizePath('a/./b')).toBe(path.join('a', 'b'))
    })
  })

  describe('buildRegistryFilePath', () => {
    it('should build registry file path', () => {
      expect(buildRegistryFilePath('/registry', 'project123')).toBe('/registry/project123.toml')
    })
  })

  describe('buildConfigFilePath', () => {
    it('should build config file path', () => {
      expect(buildConfigFilePath('/project', 'config.toml')).toBe('/project/config.toml')
    })
  })
})
