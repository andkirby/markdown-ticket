import fs from 'fs/promises';
import path from 'path';
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
export function generateProjectSpecificCode(
  project: Project,
  config: ProjectConfig,
  nextNumber: number
): string {
  const projectCode = config.project.code || project.id.toUpperCase();

  // Check if project has specific code pattern requirements
  if (project.tickets?.codePattern && project.tickets.codePattern.includes('[A-Z]')) {
    // For patterns like "^CR-[A-Z]\\d{3}$", generate CR-A001, CR-A002, etc.
    const letterIndex = Math.floor((nextNumber - 1) / 999); // Every 999 tickets, increment letter
    const numberPart = ((nextNumber - 1) % 999) + 1;
    const letter = String.fromCharCode(65 + letterIndex); // A, B, C, etc.
    return `${projectCode}-${letter}${String(numberPart).padStart(3, '0')}`;
  }

  // Default format: PROJECT-001, PROJECT-002, etc.
  return `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Loads all tickets from a project directory
 * @param projectPath - Path to project directory
 * @returns Array of ticket objects with code, title, and filename
 */
export async function loadTickets(projectPath: string): Promise<Ticket[]> {
  const tickets: Ticket[] = [];

  try {
    const files = await fs.readdir(projectPath);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    for (const filename of mdFiles) {
      const filePath = path.join(projectPath, filename);
      const content = await fs.readFile(filePath, 'utf8');

      let code: string | null = null;
      let title = '';

      // Try YAML frontmatter first
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const lines = frontmatterMatch[1].split('\n');

        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            if (match[1] === 'code') {
              code = match[2].trim();
            } else if (match[1] === 'title') {
              title = match[2].trim();
            }
          }
        }
      } else {
        // Try markdown format (- **Code**: DEB-016)
        const codeMatch = content.match(/^-\s*\*\*Code\*\*:\s*(.+)$/m);
        if (codeMatch) {
          code = codeMatch[1].trim();
        }

        const titleMatch = content.match(/^-\s*\*\*Title\/Summary\*\*:\s*(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      }

      if (code) {
        tickets.push({
          code,
          title,
          filename: filePath
        });
      }
    }
  } catch (error) {
    console.error(`Error loading tickets from ${projectPath}:`, error);
  }

  return tickets;
}

/**
 * Gets the next available ticket number for a project
 * @param projectPath - Path to project directory
 * @param projectCode - Project code prefix (e.g., "MDT", "CR")
 * @returns Next available ticket number
 */
export async function getNextTicketNumber(
  projectPath: string,
  projectCode: string
): Promise<number> {
  try {
    // Load all existing tickets to find the highest number
    const tickets = await loadTickets(projectPath);
    let maxNumber = 0;

    // Find the highest existing ticket number for this project code
    tickets.forEach(ticket => {
      if (ticket.code.startsWith(projectCode + '-')) {
        const numberPart = ticket.code.split('-')[1];
        const number = parseInt(numberPart);
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    // Also check the counter file
    const counterFile = path.join(projectPath, '.mdt-next');
    let counterNumber = 0;
    try {
      const content = await fs.readFile(counterFile, 'utf8');
      counterNumber = parseInt(content.trim()) || 0;
    } catch {
      // Counter file doesn't exist
    }

    const nextNumber = Math.max(maxNumber + 1, counterNumber);
    return nextNumber;
  } catch (error) {
    console.error('Error getting next ticket number:', error);
    return 1;
  }
}

/**
 * Updates the ticket counter file
 * @param projectPath - Path to project directory
 * @param nextNumber - Next ticket number to save
 */
export async function updateTicketCounter(
  projectPath: string,
  nextNumber: number
): Promise<void> {
  try {
    const counterFile = path.join(projectPath, '.mdt-next');
    await fs.writeFile(counterFile, nextNumber.toString(), 'utf8');
  } catch (error) {
    console.error('Error updating ticket counter:', error);
  }
}