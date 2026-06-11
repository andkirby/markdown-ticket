import { randomBytes } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

/** Shared file system utilities */

// File existence checks
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  }
  catch {
    return false
  }
}

export function directoryExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
  }
  catch {
    return false
  }
}

// File operations
export function readFile(filePath: string): string {
  if (!fileExists(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }
  try {
    return fs.readFileSync(filePath, 'utf8')
  }
  catch {
    throw new Error(`Failed to read file ${filePath}`)
  }
}

export function writeFile(filePath: string, content: string): void {
  try {
    const parentDir = path.dirname(filePath)
    if (!directoryExists(parentDir)) {
      createDirectory(parentDir)
    }
    fs.writeFileSync(filePath, content, 'utf8')
  }
  catch {
    throw new Error(`Failed to write file ${filePath}`)
  }
}

/**
 * SEC-002: Atomic file write using write-to-temp-then-rename.
 * Guarantees the target file is either fully updated or left unchanged —
 * never partially written (corrupt) on crash/restart.
 *
 * On POSIX systems, rename() is atomic. On Windows it is also atomic
 * when source and destination are on the same volume.
 *
 * @param filePath - Target file path
 * @param content - Content to write
 */
export function writeFileAtomic(filePath: string, content: string): void {
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
  try {
    const parentDir = path.dirname(filePath)
    if (!directoryExists(parentDir)) {
      createDirectory(parentDir)
    }

    fs.writeFileSync(tmpPath, content, 'utf8')
    fs.renameSync(tmpPath, filePath)
  }
  catch {
    // Clean up temp file if it was created but rename failed
    try {
      if (fileExists(tmpPath)) {
        fs.unlinkSync(tmpPath)
      }
    }
    catch {
      // Best-effort cleanup — don't mask the original error
    }
    throw new Error(`Failed to write file ${filePath}`)
  }
}

// Directory operations
export function createDirectory(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  catch {
    throw new Error(`Failed to create directory ${dirPath}`)
  }
}

export function deleteFile(filePath: string): void {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
  catch {
    throw new Error(`Failed to delete file ${filePath}`)
  }
}

// Directory listing
export function listFiles(dirPath: string, filter?: (fileName: string) => boolean): string[] {
  if (!directoryExists(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`)
  }
  try {
    const files = fs.readdirSync(dirPath)
    return filter ? files.filter(filter) : files
  }
  catch {
    throw new Error(`Failed to list files in ${dirPath}`)
  }
}

export function readDirectory(dirPath: string): fs.Dirent[] {
  if (!directoryExists(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`)
  }
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
  }
  catch {
    throw new Error(`Failed to read directory ${dirPath}`)
  }
}
