import fs from 'fs/promises';
import path from 'path';
import { loadTickets, getNextTicketNumber, updateTicketCounter } from './ticketNumbering.js';

/**
 * Finds duplicate ticket codes in a project
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object>} Object with duplicate groups
 */
export async function findDuplicates(projectPath) {
  const tickets = await loadTickets(projectPath);
  const duplicates = {};

  // Group tickets by code to find duplicates
  tickets.forEach(ticket => {
    if (!duplicates[ticket.code]) {
      duplicates[ticket.code] = [];
    }
    duplicates[ticket.code].push({
      filename: path.basename(ticket.filename),
      filepath: ticket.filename,
      title: ticket.title,
      code: ticket.code
    });
  });

  // Filter to only duplicates (more than 1 ticket per code)
  const duplicateGroups = Object.entries(duplicates)
    .filter(([code, tickets]) => tickets.length > 1)
    .map(([code, tickets]) => ({ code, tickets }));

  return { duplicates: duplicateGroups };
}

/**
 * Previews rename changes for a duplicate ticket
 * @param {string} filepath - Path to ticket file
 * @param {string} projectPath - Path to project directory
 * @param {string} projectCode - Project code prefix
 * @returns {Promise<Object>} Preview of rename operation
 */
export async function previewRename(filepath, projectPath, projectCode) {
  // Get next available ticket number
  const nextNumber = await getNextTicketNumber(projectPath, projectCode);
  const newCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;

  // Read current file to get old code
  const content = await fs.readFile(filepath, 'utf8');
  const codeMatch = content.match(/^code:\s*(.+)$/m) || content.match(/^-\s*\*\*Code\*\*:\s*(.+)$/m);
  const oldCode = codeMatch ? codeMatch[1].trim() : '';

  // Generate new filename
  const oldFilename = path.basename(filepath);
  const newFilename = oldFilename.replace(oldCode, newCode);

  return {
    newCode,
    newFilename,
    oldCode,
    oldFilename
  };
}

/**
 * Resolves a duplicate by either renaming or deleting
 * @param {string} action - 'rename' or 'delete'
 * @param {string} oldFilepath - Path to ticket file
 * @param {string} projectPath - Path to project directory
 * @param {string} projectCode - Project code prefix
 * @returns {Promise<Object>} Result of resolution operation
 */
export async function resolveDuplicate(action, oldFilepath, projectPath, projectCode) {
  if (action === 'delete') {
    await fs.unlink(oldFilepath);
    return { success: true, action: 'deleted' };
  }

  if (action === 'rename') {
    // Get next available ticket number
    const nextNumber = await getNextTicketNumber(projectPath, projectCode);
    const newCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;

    // Read current file content
    const content = await fs.readFile(oldFilepath, 'utf8');

    // Extract current code from content
    const codeMatch = content.match(/^code:\s*(.+)$/m);
    const oldCode = codeMatch ? codeMatch[1].trim() : '';

    // Replace code in content
    const newContent = content.replace(/^code:\s*.+$/m, `code: ${newCode}`);

    // Generate new filename
    const oldFilename = path.basename(oldFilepath);
    const newFilename = oldFilename.replace(oldCode, newCode);
    const newFilepath = path.join(path.dirname(oldFilepath), newFilename);

    // Write new file and delete old one
    await fs.writeFile(newFilepath, newContent, 'utf8');
    await fs.unlink(oldFilepath);

    // Update counter
    await updateTicketCounter(projectPath, nextNumber + 1);

    return {
      success: true,
      action: 'renamed',
      oldCode,
      newCode,
      oldFilename,
      newFilename
    };
  }

  throw new Error(`Invalid action: ${action}`);
}
