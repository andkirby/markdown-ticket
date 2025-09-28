/**
 * Shared Ticket DTO for Frontend, Backend, and MCP
 * Ensures consistent data structure across all systems
 */
/**
 * Normalize ticket data to ensure consistent structure
 */
export function normalizeTicket(rawTicket) {
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
        // Normalize relationship fields to arrays (never undefined)
        relatedTickets: normalizeArray(rawTicket.relatedTickets),
        dependsOn: normalizeArray(rawTicket.dependsOn),
        blocks: normalizeArray(rawTicket.blocks)
    };
}
/**
 * Convert various formats to array
 */
function normalizeArray(value) {
    if (Array.isArray(value)) {
        // Handle array elements that might be JSON strings
        const flattened = value.flatMap(item => {
            if (typeof item === 'string' && item.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(item);
                    return Array.isArray(parsed) ? parsed : [item];
                }
                catch {
                    return [item];
                }
            }
            return item;
        });
        return flattened.filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        // Try to parse as JSON first
        if (value.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.filter(Boolean);
                }
            }
            catch {
                // Fall through to comma-separated parsing
            }
        }
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}
/**
 * Parse date from various formats
 */
function parseDate(dateValue) {
    if (!dateValue)
        return null;
    if (dateValue instanceof Date)
        return dateValue;
    if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}
/**
 * Convert arrays back to comma-separated strings for YAML
 */
export function arrayToString(arr) {
    return Array.isArray(arr) ? arr.join(',') : '';
}
//# sourceMappingURL=ticketDto.js.map