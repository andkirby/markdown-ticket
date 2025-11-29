import fs from 'fs/promises';
import path from 'path';
// NOTE: Duplicate detection functionality is deprecated per MDT-082
// Ticket numbering logic moved to shared/services/TicketService.ts
// This file is kept for backward compatibility but functionality is disabled

interface Ticket {
  code: string;
  title: string;
  filename: string;
}

export interface DuplicateTicket {
  filename: string;
  filepath: string;
  title: string;
  code: string;
}

export interface DuplicateGroup {
  code: string;
  tickets: DuplicateTicket[];
}

export interface DuplicatesResult {
  duplicates: DuplicateGroup[];
}

export interface RenamePreview {
  newCode: string;
  newFilename: string;
  oldCode: string;
  oldFilename: string;
}

export interface ResolutionResult {
  success: boolean;
  action: 'deleted' | 'renamed';
  oldCode?: string;
  newCode?: string;
  oldFilename?: string;
  newFilename?: string;
}

/**
 * Finds duplicate ticket codes in a project
 * @deprecated Functionality moved to MCP server per MDT-082
 * @param projectPath - Path to project directory
 * @returns Object with duplicate groups
 */
export async function findDuplicates(projectPath: string): Promise<DuplicatesResult> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('findDuplicates is deprecated - use MCP server tools instead');
  return { duplicates: [] };
}

/**
 * Previews rename changes for a duplicate ticket
 * @deprecated Functionality moved to MCP server per MDT-082
 * @param filepath - Path to ticket file
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix
 * @returns Preview of rename operation
 */
export async function previewRename(
  filepath: string,
  projectPath: string,
  projectCode: string
): Promise<RenamePreview> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('previewRename is deprecated - use MCP server tools instead');
  return {
    newCode: '',
    newFilename: '',
    oldCode: '',
    oldFilename: ''
  };
}

/**
 * Resolves a duplicate by either renaming or deleting
 * @deprecated Functionality moved to MCP server per MDT-082
 * @param action - 'rename' or 'delete'
 * @param oldFilepath - Path to ticket file
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix
 * @returns Result of resolution operation
 */
export async function resolveDuplicate(
  action: 'rename' | 'delete',
  oldFilepath: string,
  projectPath: string,
  projectCode: string
): Promise<ResolutionResult> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('resolveDuplicate is deprecated - use MCP server tools instead');
  throw new Error('resolveDuplicate is deprecated - use MCP server tools instead');
}