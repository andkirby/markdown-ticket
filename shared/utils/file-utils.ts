import fs from 'fs';
import path from 'path';

/** Shared file system utilities */

// File existence checks
export const fileExists = (filePath: string): boolean => {
  try { return fs.existsSync(filePath); } catch { return false; }
};

export const directoryExists = (dirPath: string): boolean => {
  try { return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(); } catch { return false; }
};

// File operations
export const readFile = (filePath: string): string => {
  if (!fileExists(filePath)) throw new Error(`File not found: ${filePath}`);
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (error) { throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`); }
};

export const writeFile = (filePath: string, content: string): void => {
  try {
    const parentDir = path.dirname(filePath);
    if (!directoryExists(parentDir)) createDirectory(parentDir);
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Directory operations
export const createDirectory = (dirPath: string): void => {
  try { fs.mkdirSync(dirPath, { recursive: true }); }
  catch (error) { throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`); }
};

export const deleteFile = (filePath: string): void => {
  try { if (fileExists(filePath)) fs.unlinkSync(filePath); }
  catch (error) { throw new Error(`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : String(error)}`); }
};

// Directory listing
export const listFiles = (dirPath: string, filter?: (fileName: string) => boolean): string[] => {
  if (!directoryExists(dirPath)) throw new Error(`Directory not found: ${dirPath}`);
  try {
    const files = fs.readdirSync(dirPath);
    return filter ? files.filter(filter) : files;
  } catch (error) {
    throw new Error(`Failed to list files in ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const readDirectory = (dirPath: string): fs.Dirent[] => {
  if (!directoryExists(dirPath)) throw new Error(`Directory not found: ${dirPath}`);
  try { return fs.readdirSync(dirPath, { withFileTypes: true }); }
  catch (error) { throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`); }
};