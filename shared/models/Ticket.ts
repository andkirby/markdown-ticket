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
  /**
   * Full markdown content including:
   * - ## Description section (problem statement, current/desired state)
   * - ## Rationale section (why this change is needed)
   * - ## Solution Analysis
   * - ## Implementation Specification
   * - ## Acceptance Criteria
   */
  content: string;
  filePath: string;

  // Optional fields
  phaseEpic?: string;
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
    assignee: rawTicket.assignee || '',
    implementationNotes: rawTicket.implementationNotes || '',
    
    // Normalize relationship fields to arrays
    relatedTickets: normalizeArray(rawTicket.relatedTickets),
    dependsOn: normalizeArray(rawTicket.dependsOn),
    blocks: normalizeArray(rawTicket.blocks)
  };
}

/**
 * Convert arrays back to comma-separated strings for YAML
 */
export function arrayToString(arr: string[]): string {
  return Array.isArray(arr) ? arr.join(',') : '';
}

/**
 * Data interface for creating new tickets
 */
export interface TicketData {
  title: string;
  type: string;
  priority?: string;
  phaseEpic?: string;
  impactAreas?: string[];
  relatedTickets?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  content?: string;
}

/**
 * Allowed attributes for update_cr_attrs MCP tool
 * Restricted subset of TicketData - excludes title and content (immutable)
 * Per docs/create_ticket.md: includes post-implementation fields like implementationDate and implementationNotes
 *
 * MDT-064 (H1 as Single Source of Truth):
 * - Title must be updated via H1 header in markdown using manage_cr_sections
 * - YAML title attribute is auto-generated from H1 and should NOT be updated directly
 * - This enforces H1 as the authoritative title source
 */
export interface TicketUpdateAttrs {
  priority?: string;
  phaseEpic?: string;
  relatedTickets?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  implementationDate?: Date | null;
  implementationNotes?: string;
}

/**
 * Whitelist of attributes allowed for update_cr_attrs operations
 * Aligned with docs/create_ticket.md lines 28-42 (Complete Attribute Reference)
 *
 * Excludes:
 * - code (system field)
 * - title (MDT-064: update via H1 header in markdown using manage_cr_sections)
 * - type (immutable after creation)
 * - status (use update_cr_status tool)
 * - content (use manage_cr_sections tool)
 * - dateCreated (system field, immutable)
 * - lastModified (auto-updated on any change)
 */
export const TICKET_UPDATE_ALLOWED_ATTRS = new Set<keyof TicketUpdateAttrs>([
  'priority',
  'phaseEpic',
  'relatedTickets',
  'dependsOn',
  'blocks',
  'assignee',
  'implementationDate',
  'implementationNotes'
]);

/**
 * Filtering interface for ticket queries
 */
export interface TicketFilters {
  status?: string | string[];
  type?: string | string[];
  priority?: string | string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}
