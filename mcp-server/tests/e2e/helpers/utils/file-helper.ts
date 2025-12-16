/**
 * File Helper Utility
 *
 * Consolidates file system operations for ProjectFactory refactoring.
 * Provides proper error handling and abstraction over fs operations.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProjectFactoryError } from '../types/project-factory-types';

/** File system operations with error handling */
export class FileHelper {
  /** Create directory recursively with error handling */
  static createDir(dirPath: string, recursive = true): void {
    try {
      mkdirSync(dirPath, { recursive });
    } catch (error) {
      throw new ProjectFactoryError(`Failed to create directory: ${dirPath}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Write file with error handling */
  static writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
    try {
      writeFileSync(filePath, content, encoding);
    } catch (error) {
      throw new ProjectFactoryError(`Failed to write file: ${filePath}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Check if file or directory exists */
  static exists(path: string): boolean {
    try {
      return existsSync(path);
    } catch {
      return false;
    }
  }

  /** Read file with error handling */
  static readFile(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    try {
      return readFileSync(filePath, encoding);
    } catch (error) {
      throw new ProjectFactoryError(`Failed to read file: ${filePath}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Create directory and write file in one operation */
  static createFileWithDir(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dirPath && !this.exists(dirPath)) this.createDir(dirPath);
    this.writeFile(filePath, content, encoding);
  }

  /** Join path segments safely */
  static joinPath(...segments: string[]): string {
    return join(...segments);
  }
}