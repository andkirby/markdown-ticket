/**
 * Shared Ticket Model for Frontend, Backend, and MCP
 * Ensures consistent data structure across all systems
 */

export interface Ticket {
  // Core required fields
  code: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  dateCreated: Date | null;
  lastModified: Date | null;
  content: string;
  filePath: string;
  
  // Optional fields
  phaseEpic?: string;
  description?: string;
  rationale?: string;
  assignee?: string;
  implementationDate?: Date | null;
  implementationNotes?: string;
  
  // Relationship fields (always arrays)
  relatedTickets: string[];
  dependsOn: string[];
  blocks: string[];
}

/**
 * Helper function to safely parse date values
 */
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Helper function to normalize array fields
 */
function normalizeArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Normalize ticket data to ensure consistent structure
 */
export function normalizeTicket(rawTicket: any): Ticket {
  return {
    // Map core fields
    code: rawTicket.code || rawTicket.key || '',
    title: rawTicket.title || '',
    status: rawTicket.status || 'Proposed',
    type: rawTicket.type || 'Feature Enhancement',
    priority: rawTicket.priority || 'Medium',
    content: rawTicket.content || '',
    filePath: rawTicket.filePath || rawTicket.path || '',
    
    // Handle dates
    dateCreated: parseDate(rawTicket.dateCreated),
    lastModified: parseDate(rawTicket.lastModified),
    implementationDate: parseDate(rawTicket.implementationDate),
    
    // Map optional fields
    phaseEpic: rawTicket.phaseEpic || '',
    description: rawTicket.description || '',
    rationale: rawTicket.rationale || '',
    assignee: rawTicket.assignee || '',
    implementationNotes: rawTicket.implementationNotes || '',
    
    // Normalize relationship fields to arrays
    relatedTickets: normalizeArray(rawTicket.relatedTickets),
    dependsOn: normalizeArray(rawTicket.dependsOn),
    blocks: normalizeArray(rawTicket.blocks)
  };
}

/**
 * Legacy export for backward compatibility
 */
export type TicketDTO = Ticket;
