import { Ticket } from '../types';

/**
 * Create a ticket template in markdown format
 */
export function createTicketTemplate(ticketCode: string, title: string, type: string): string {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `---
code: ${ticketCode}
title: ${title}
status: Proposed
dateCreated: ${new Date().toISOString()}
type: ${type}
priority: Medium
phaseEpic: Phase A (Foundation)
source: User Request
impact: Minor
effort: Medium
relatedTickets: 
supersedes: 
dependsOn: 
blocks: 
relatedDocuments: 
implementationDate: 
implementationNotes: 
lastModified: ${new Date().toISOString()}
---

# Change Request: ${ticketCode}

## Description
${title}

## Background
Provide background information and context for this change request.

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Implementation Notes
Describe the implementation approach and technical details.

## Acceptance Criteria
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
- [ ] Acceptance criterion 3

## Related Tickets
- Related ticket codes (if any)

## Impact Assessment
- **Impact**: Describe the impact on users, systems, or processes
- **Effort**: Estimate of effort required (Low/Medium/High)
- **Risk**: Any potential risks or concerns

## Testing Plan
- [ ] Unit tests completed
- [ ] Integration tests completed
- [ ] User acceptance testing
- [ ] Performance testing (if applicable)

## Deployment Plan
- [ ] Deployment checklist completed
- [ ] Rollback plan documented
- [ ] Communication plan prepared

---

*Created on ${currentDate}*
`;
}

/**
 * Parse markdown content and extract ticket information
 */
export function parseMarkdownTicket(content: string): Partial<Ticket> | null {
  try {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2];
    
    // Parse frontmatter
    const frontmatterData: Record<string, any> = {};
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        frontmatterData[key] = value.trim();
      }
    }

    // Extract basic information from body
    const titleMatch = body.match(/^# Change Request: ([^\n]+)/);
    const descriptionMatch = body.match(/^## Description\s*\n([\s\S]*?)(?=##|$)/);
    
    return {
      code: frontmatterData.code || '',
      title: frontmatterData.title || (titleMatch ? titleMatch[1] : 'Untitled'),
      status: frontmatterData.status || 'Proposed',
      dateCreated: frontmatterData.dateCreated ? new Date(frontmatterData.dateCreated) : new Date(),
      type: frontmatterData.type || 'Feature Enhancement',
      priority: frontmatterData.priority || 'Medium',
      phaseEpic: frontmatterData.phaseEpic || 'Phase A (Foundation)',
      source: frontmatterData.source || 'User Request',
      impact: frontmatterData.impact || 'Minor',
      effort: frontmatterData.effort || 'Medium',
      relatedTickets: frontmatterData.relatedTickets ? frontmatterData.relatedTickets.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      supersedes: frontmatterData.supersedes || undefined,
      dependsOn: frontmatterData.dependsOn ? frontmatterData.dependsOn.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      blocks: frontmatterData.blocks ? frontmatterData.blocks.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      relatedDocuments: frontmatterData.relatedDocuments ? frontmatterData.relatedDocuments.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      implementationDate: frontmatterData.implementationDate ? new Date(frontmatterData.implementationDate) : undefined,
      implementationNotes: frontmatterData.implementationNotes || undefined,
      content: content.trim()
    };
  } catch (error) {
    console.error('Failed to parse markdown ticket:', error);
    return null;
  }
}

/**
 * Validate ticket data from markdown
 */
export function validateMarkdownTicket(ticketData: Partial<Ticket>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!ticketData.code) {
    errors.push('Ticket code is required');
  }

  if (!ticketData.title) {
    errors.push('Ticket title is required');
  }

  if (!ticketData.type) {
    errors.push('Ticket type is required');
  }

  // Validate code format (CR-XXX pattern)
  if (ticketData.code && !/^CR-\d+$/.test(ticketData.code)) {
    errors.push('Ticket code must follow format CR-XXX (e.g., CR-001)');
  }

  // Validate priority
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  if (ticketData.priority && !validPriorities.includes(ticketData.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  // Validate status
  const validStatuses = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'On Hold', 'Rejected', 'Superseded', 'Deprecated', 'Duplicate', 'Partially Implemented'];
  if (ticketData.status && !validStatuses.includes(ticketData.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate type
  const validTypes = ['Bug Fix', 'Feature Enhancement', 'Technical Debt', 'Architecture', 'Documentation'];
  if (ticketData.type && !validTypes.includes(ticketData.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate impact
  const validImpacts = ['Critical', 'Major', 'Minor', 'Trivial'];
  if (ticketData.impact && !validImpacts.includes(ticketData.impact)) {
    errors.push(`Impact must be one of: ${validImpacts.join(', ')}`);
  }

  // Validate effort
  const validEfforts = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];
  if (ticketData.effort && !validEfforts.includes(ticketData.effort)) {
    errors.push(`Effort must be one of: ${validEfforts.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format ticket data as markdown
 */
export function formatTicketAsMarkdown(ticket: Ticket): string {
  const frontmatter = `---
code: ${ticket.code}
title: ${ticket.title}
status: ${ticket.status}
dateCreated: ${ticket.dateCreated.toISOString()}
type: ${ticket.type}
priority: ${ticket.priority}
phaseEpic: ${ticket.phaseEpic}
source: ${ticket.source}
impact: ${ticket.impact}
effort: ${ticket.effort}
relatedTickets: ${ticket.relatedTickets?.join(', ') || ''}
supersedes: ${ticket.supersedes || ''}
dependsOn: ${ticket.dependsOn?.join(', ') || ''}
blocks: ${ticket.blocks?.join(', ') || ''}
relatedDocuments: ${ticket.relatedDocuments?.join(', ') || ''}
implementationDate: ${ticket.implementationDate ? ticket.implementationDate.toISOString() : ''}
implementationNotes: ${ticket.implementationNotes || ''}
lastModified: ${ticket.lastModified.toISOString()}
---

`;

  return frontmatter + ticket.content;
}

/**
 * Extract checklist items from markdown content
 */
export function extractChecklistItems(content: string): Array<{ text: string; completed: boolean }> {
  const checklistRegex = /^- \[([ x])\]\s+(.+)$/gm;
  const items: Array<{ text: string; completed: boolean }> = [];
  let match;

  while ((match = checklistRegex.exec(content)) !== null) {
    items.push({
      text: match[2].trim(),
      completed: match[1] === 'x'
    });
  }

  return items;
}

/**
 * Generate checklist markdown from items
 */
export function generateChecklistMarkdown(items: Array<{ text: string; completed: boolean }>): string {
  return items.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`).join('\n');
}

/**
 * Extract links from markdown content
 */
export function extractLinks(content: string): Array<{ text: string; url: string }> {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: Array<{ text: string; url: string }> = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }

  return links;
}

/**
 * Extract code blocks from markdown content
 */
export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || '',
      code: match[2].trim()
    });
  }

  return blocks;
}

/**
 * Clean markdown content for display
 */
export function cleanMarkdownForDisplay(content: string): string {
  // Remove frontmatter
  let cleaned = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  
  // Remove trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Get word count from markdown content
 */
export function getWordCount(content: string): number {
  const cleaned = cleanMarkdownForDisplay(content);
  return cleaned.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get reading time estimate (assuming 200 words per minute)
 */
export function getReadingTime(content: string): number {
  const wordCount = getWordCount(content);
  return Math.ceil(wordCount / 200);
}

/**
 * Check if content has been modified from template
 */
export function isModifiedFromTemplate(content: string, template: string): boolean {
  const cleanedContent = cleanMarkdownForDisplay(content);
  const cleanedTemplate = cleanMarkdownForDisplay(template);
  
  return cleanedContent !== cleanedTemplate;
}