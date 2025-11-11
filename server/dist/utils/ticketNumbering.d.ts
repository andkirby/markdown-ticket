import { Project, ProjectConfig } from '../../shared/models/Project.js';
export interface Ticket {
    code: string;
    title: string;
    filename: string;
}
/**
 * Generates a project-specific ticket code based on configuration
 * @param project - Project object with configuration
 * @param config - Project configuration object
 * @param nextNumber - Next available ticket number
 * @returns Generated ticket code (e.g., "MDT-001", "CR-A001")
 */
export declare function generateProjectSpecificCode(project: Project, config: ProjectConfig, nextNumber: number): string;
/**
 * Loads all tickets from a project directory
 * @param projectPath - Path to project directory
 * @returns Array of ticket objects with code, title, and filename
 */
export declare function loadTickets(projectPath: string): Promise<Ticket[]>;
/**
 * Gets the next available ticket number for a project
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix (e.g., "MDT", "CR")
 * @returns Next available ticket number
 */
export declare function getNextTicketNumber(projectPath: string, projectCode: string): Promise<number>;
/**
 * Updates the ticket counter file
 * @param projectPath - Path to project directory
 * @param nextNumber - Next ticket number to save
 */
export declare function updateTicketCounter(projectPath: string, nextNumber: number): Promise<void>;
