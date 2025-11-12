/**
 * Shared Ticket Model for Frontend, Backend, and MCP
 * Ensures consistent data structure across all systems
 */
export interface Ticket {
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
    phaseEpic?: string;
    assignee?: string;
    implementationDate?: Date | null;
    implementationNotes?: string;
    relatedTickets: string[];
    dependsOn: string[];
    blocks: string[];
}
/**
 * Normalize ticket data to ensure consistent structure
 */
export declare function normalizeTicket(rawTicket: any): Ticket;
/**
 * Convert arrays back to comma-separated strings for YAML
 */
export declare function arrayToString(arr: string[]): string;
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
//# sourceMappingURL=Ticket.d.ts.map