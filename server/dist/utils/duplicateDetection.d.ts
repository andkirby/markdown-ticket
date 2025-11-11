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
 * @param projectPath - Path to project directory
 * @returns Object with duplicate groups
 */
export declare function findDuplicates(projectPath: string): Promise<DuplicatesResult>;
/**
 * Previews rename changes for a duplicate ticket
 * @param filepath - Path to ticket file
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix
 * @returns Preview of rename operation
 */
export declare function previewRename(filepath: string, projectPath: string, projectCode: string): Promise<RenamePreview>;
/**
 * Resolves a duplicate by either renaming or deleting
 * @param action - 'rename' or 'delete'
 * @param oldFilepath - Path to ticket file
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix
 * @returns Result of resolution operation
 */
export declare function resolveDuplicate(action: 'rename' | 'delete', oldFilepath: string, projectPath: string, projectCode: string): Promise<ResolutionResult>;
