// NOTE: Duplicate detection functionality is deprecated per MDT-082
// Ticket numbering logic moved to shared/services/TicketService.ts
// This file is kept for backward compatibility but functionality is disabled

interface DuplicateTicket {
  filename: string
  filepath: string
  title: string
  code: string
}

interface DuplicateGroup {
  code: string
  tickets: DuplicateTicket[]
}

export interface DuplicatesResult {
  duplicates: DuplicateGroup[]
}

export interface RenamePreview {
  newCode: string
  newFilename: string
  oldCode: string
  oldFilename: string
}

export interface ResolutionResult {
  success: boolean
  action: 'deleted' | 'renamed'
  oldCode?: string
  newCode?: string
  oldFilename?: string
  newFilename?: string
}

/**
 * Finds duplicate ticket codes in a project.
 *
 * @param _projectPath - Path to project directory.
 * @returns Object with duplicate groups.
 * @deprecated Functionality moved to MCP server per MDT-082.
 */
export async function findDuplicates(_projectPath: string): Promise<DuplicatesResult> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('findDuplicates is deprecated - use MCP server tools instead')

  return { duplicates: [] }
}

/**
 * Previews rename changes for a duplicate ticket.
 *
 * @param _filepath - Path to ticket file.
 * @param _projectPath - Path to project directory.
 * @param _projectCode - Project code prefix.
 * @returns Preview of rename operation.
 * @deprecated Functionality moved to MCP server per MDT-082.
 */
export async function previewRename(
  _filepath: string,
  _projectPath: string,
  _projectCode: string,
): Promise<RenamePreview> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('previewRename is deprecated - use MCP server tools instead')

  return {
    newCode: '',
    newFilename: '',
    oldCode: '',
    oldFilename: '',
  }
}

/**
 * Resolves a duplicate by either renaming or deleting.
 *
 * @param _action - 'rename' or 'delete'.
 * @param _oldFilepath - Path to ticket file.
 * @param _projectPath - Path to project directory.
 * @param _projectCode - Project code prefix.
 * @returns Result of resolution operation.
 * @deprecated Functionality moved to MCP server per MDT-082.
 */
export async function resolveDuplicate(
  _action: 'rename' | 'delete',
  _oldFilepath: string,
  _projectPath: string,
  _projectCode: string,
): Promise<ResolutionResult> {
  // Deprecated: Functionality moved to MCP server per MDT-082
  console.warn('resolveDuplicate is deprecated - use MCP server tools instead')
  throw new Error('resolveDuplicate is deprecated - use MCP server tools instead')
}
