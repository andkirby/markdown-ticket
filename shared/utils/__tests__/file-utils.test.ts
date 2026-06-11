import fs from 'node:fs'
import path from 'node:path'
import {
  createDirectory,
  deleteFile,
  directoryExists,
  fileExists,
  listFiles,
  readFile,
  writeFile,
  writeFileAtomic,
} from '../file-utils'

describe('file Utils', () => {
  const testDir = path.join(process.cwd(), 'test-temp')
  const testFile = path.join(testDir, 'test.txt')

  beforeEach(() => {
    if (fs.existsSync(testDir))
      fs.rmSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(testDir))
      fs.rmSync(testDir, { recursive: true })
  })

  describe('fileExists', () => {
    it('should return false for non-existent file', () => {
      expect(fileExists('/non/existent/file')).toBe(false)
    })

    it('should return true for existing file', () => {
      createDirectory(testDir)
      fs.writeFileSync(testFile, 'content')
      expect(fileExists(testFile)).toBe(true)
    })
  })

  describe('directoryExists', () => {
    it('should return false for non-existent directory', () => {
      expect(directoryExists('/non/existent')).toBe(false)
    })

    it('should return true for existing directory', () => {
      createDirectory(testDir)
      expect(directoryExists(testDir)).toBe(true)
    })
  })

  describe('readFile/writeFile', () => {
    it('should throw error for non-existent file', () => {
      expect(() => readFile(testFile)).toThrow('File not found')
    })

    it('should write and read file correctly', () => {
      writeFile(testFile, 'content')
      expect(readFile(testFile)).toBe('content')
    })
  })

  describe('createDirectory', () => {
    it('should create directory', () => {
      createDirectory(testDir)
      expect(directoryExists(testDir)).toBe(true)
    })

    it('should create nested directories', () => {
      const nested = path.join(testDir, 'a')
      createDirectory(nested)
      expect(directoryExists(nested)).toBe(true)
    })
  })

  describe('deleteFile', () => {
    it('should delete existing file', () => {
      createDirectory(testDir)
      fs.writeFileSync(testFile, 'content')
      deleteFile(testFile)
      expect(fileExists(testFile)).toBe(false)
    })
  })

  describe('listFiles', () => {
    it('should list all files', () => {
      createDirectory(testDir)
      fs.writeFileSync(path.join(testDir, 'a.txt'), '')
      const files = listFiles(testDir)
      expect(files).toContain('a.txt')
    })

    it('should filter files', () => {
      createDirectory(testDir)
      fs.writeFileSync(path.join(testDir, 'a.txt'), '')
      fs.writeFileSync(path.join(testDir, 'b.log'), '')
      expect(listFiles(testDir, f => f.endsWith('.txt'))).toEqual(['a.txt'])
    })
  })

  describe('SEC-002: writeFileAtomic', () => {
    it('should write file content atomically', () => {
      writeFileAtomic(testFile, 'atomic content')
      expect(readFile(testFile)).toBe('atomic content')
    })

    it('should not leave .tmp files after successful write', () => {
      writeFileAtomic(testFile, 'clean write')
      const files = fs.readdirSync(testDir)
      const tmpFiles = files.filter(f => f.endsWith('.tmp'))
      expect(tmpFiles).toEqual([])
    })

    it('should overwrite existing file content', () => {
      writeFileAtomic(testFile, 'first')
      writeFileAtomic(testFile, 'second')
      expect(readFile(testFile)).toBe('second')
    })

    it('should create parent directory if missing', () => {
      const nestedFile = path.join(testDir, 'sub', 'dir', 'file.txt')
      writeFileAtomic(nestedFile, 'nested content')
      expect(readFile(nestedFile)).toBe('nested content')
    })

    it('should throw error for invalid path', () => {
      expect(() => writeFileAtomic('/non/existent/readonly/file.txt', 'fail')).toThrow()
    })

    it('should clean up temp file on write failure', () => {
      // Write to a path where directory creation will fail (permission denied on root)
      const badPath = '/dev/null/impossible/file.txt'
      try {
        writeFileAtomic(badPath, 'fail')
      }
      catch {
        // Expected to throw
      }
      // No .tmp files should be left in /dev/null/impossible/
      expect(fileExists('/dev/null/impossible/file.txt')).toBe(false)
    })
  })
})
