import { Ticket } from '../types';
import { createTicketTemplate } from './markdownParser';

interface FileServiceOptions {
  storageKey?: string;
  autoSave?: boolean;
}

interface StoredTicket {
  ticket: Ticket;
  timestamp: number;
}

export class FileService {
  private storageKey: string;
  private autoSave: boolean;

  constructor(options: FileServiceOptions = {}) {
    this.storageKey = options.storageKey || 'md-tickets';
    this.autoSave = options.autoSave ?? true;
  }

  /**
   * Initialize the file service
   */
  async initialize(): Promise<void> {
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available, using in-memory storage');
        return;
      }
      
      // Initialize file service silently
    } catch (error) {
      console.error('Failed to initialize file service:', error);
      throw error;
    }
  }

  /**
   * Get the current project ID (temporary implementation)
   * This should be passed from the caller in a real implementation
   */
  private getCurrentProject(): string | null {
    // For now, try to get from URL or localStorage
    if (typeof window !== 'undefined') {
      // Try to get project from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const projectFromUrl = urlParams.get('project');
      if (projectFromUrl) {
        return projectFromUrl;
      }

      // Try to get from localStorage (if set by multi-project hook)
      const currentProject = localStorage.getItem('current-project');
      if (currentProject) {
        return currentProject;
      }
    }

    // Default to first available project
    return 'debug'; // This matches the DEB project we've been testing with
  }

  /**
   * Load all tickets from localStorage
   */
  async loadAllTickets(): Promise<Ticket[]> {
    try {
      // First try to load from actual markdown files
      const ticketsFromFiles = await this.loadTicketsFromFiles();
      if (ticketsFromFiles.length > 0) {
        return ticketsFromFiles;
      }

      // Fallback to localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data: StoredTicket[] = JSON.parse(stored);
          const tickets = data.map(item => ({
            ...item.ticket,
            dateCreated: item.ticket.dateCreated ? new Date(item.ticket.dateCreated) : new Date(),
            implementationDate: item.ticket.implementationDate ? new Date(item.ticket.implementationDate) : undefined,
            lastModified: item.ticket.lastModified ? new Date(item.ticket.lastModified) : new Date()
          }));
          return tickets.sort((a, b) => (b.dateCreated?.getTime() || 0) - (a.dateCreated?.getTime() || 0));
        }
      }

      // Final fallback to mock tickets
      return this.getMockTickets();
    } catch (error) {
      console.error('Failed to load tickets:', error);
      return this.getMockTickets();
    }
  }

  /**
   * Load tickets from markdown files in the tasks directory
   */
  private async loadTicketsFromFiles(): Promise<Ticket[]> {
    try {
      // In a browser environment, we'll need to fetch files from the server
      // For now, we'll use the file watcher to get the files
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        return [];
      }
      
      const files = await response.json();
      const tickets: Ticket[] = [];

      for (const file of files) {
        try {
          const fileResponse = await fetch(`/api/tasks/${file}`);
          if (!fileResponse.ok) continue;
          
          const content = await fileResponse.text();
          const ticket = this.parseMarkdownTicket(content, file);
          if (ticket) {
            tickets.push(ticket);
          }
        } catch (error) {
          console.warn(`Failed to load ticket from file ${file}:`, error);
        }
      }

      return tickets.sort((a, b) => (b.dateCreated?.getTime() || 0) - (a.dateCreated?.getTime() || 0));
    } catch (error) {
      console.warn('Failed to load tickets from files:', error);
      return [];
    }
  }

  /**
   * Parse a markdown file content into a Ticket object
   */
  private parseMarkdownTicket(content: string, filename: string): Ticket | null {
    try {
      const lines = content.split('\n');
      const ticket: Partial<Ticket> = {};
      let contentStart = -1;

      // Parse front matter and headers
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for front matter
        if (line.startsWith('---')) {
          if (contentStart === -1) {
            contentStart = i + 1;
            continue;
          } else {
            // End of front matter
            break;
          }
        }

        // Parse key-value pairs
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          
          switch (key.trim()) {
            case 'code':
              ticket.code = value.trim();
              break;
            case 'title':
              ticket.title = value.trim();
              break;
            case 'status':
              ticket.status = value.trim() as any;
              break;
            case 'dateCreated':
              ticket.dateCreated = new Date(value.trim());
              break;
            case 'type':
              ticket.type = value.trim();
              break;
            case 'priority':
              ticket.priority = value.trim();
              break;
            case 'tags':
              break;
          }
        }

        // Check for title in header
        if (line.startsWith('# ') && !ticket.title) {
          ticket.title = line.substring(2).trim();
        }
      }

      // If we didn't find a code, generate one from filename
      if (!ticket.code) {
        const baseName = filename.replace('.md', '');
        ticket.code = baseName.toUpperCase();
      }

      // Set default values for missing fields
      const finalTicket: Ticket = {
        code: ticket.code || 'UNKNOWN',
        title: ticket.title || 'Untitled Ticket',
        status: ticket.status || 'Proposed',
        dateCreated: ticket.dateCreated || new Date(),
        type: ticket.type || 'General',
        priority: ticket.priority || 'Medium',
        phaseEpic: 'Phase A (Foundation)',
        description: ticket.description || '',
        rationale: ticket.rationale || '',
        relatedTickets: ticket.relatedTickets || [],
        dependsOn: ticket.dependsOn || [],
        blocks: ticket.blocks || [],
        assignee: ticket.assignee || '',
        implementationDate: ticket.implementationDate,
        implementationNotes: ticket.implementationNotes,
        filePath: `./tasks/${filename}`,
        lastModified: new Date(),
        content: content,
      };

      return finalTicket;
    } catch (error) {
      console.warn('Failed to parse markdown ticket:', error);
      return null;
    }
  }

  /**
   * Load a specific ticket by its code
   */
  async loadTicket(ticketCode: string): Promise<Ticket | null> {
    try {
      const tickets = await this.loadAllTickets();
      return tickets.find(ticket => ticket.code === ticketCode) || null;
    } catch (error) {
      console.warn(`Ticket ${ticketCode} not found:`, error);
      return null;
    }
  }

  /**
   * Save a ticket to localStorage
   */
  async saveTicket(ticket: Ticket): Promise<void> {
    try {
      const tickets = await this.loadAllTickets();
      
      // Update existing ticket or add new one
      const existingIndex = tickets.findIndex(t => t.code === ticket.code);
      if (existingIndex >= 0) {
        tickets[existingIndex] = ticket;
      } else {
        tickets.push(ticket);
      }

      if (this.autoSave && typeof window !== 'undefined' && window.localStorage) {
        const storedData: StoredTicket[] = tickets.map(t => ({
          ticket: t,
          timestamp: Date.now()
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(storedData));
      }

    } catch (error) {
      console.error(`FileService: Failed to save ticket ${ticket.code}:`, error);
      throw error;
    }
  }

  /**
   * Create a new ticket
   */
  async createTicket(ticketCode: string, title: string, type: string): Promise<Ticket> {
    const ticketContent = createTicketTemplate(ticketCode, title, type);
    const ticket: Ticket = {
      code: ticketCode,
      title,
      status: 'Proposed',
      dateCreated: new Date(),
      type,
      priority: 'Medium',
      phaseEpic: 'Phase A (Foundation)',
      description: '',
      rationale: '',
      relatedTickets: [],
      dependsOn: [],
      blocks: [],
      assignee: '',
      implementationDate: undefined,
      implementationNotes: undefined,
      filePath: `./tickets/${ticketCode}.md`,
      lastModified: new Date(),
      content: ticketContent
    };

    await this.saveTicket(ticket);
    return ticket;
  }

  /**
   * Update an existing ticket
   */
  async updateTicket(ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> {
    
    // For status-only updates, use the new PATCH endpoint for better performance
    if (Object.keys(updates).length <= 3 && updates.status && !updates.content) {
      return await this.updateTicketPartial(ticketCode, updates);
    }
    
    // For larger updates, use the existing method
    return await this.updateTicketFull(ticketCode, updates);
  }

  /**
   * Update ticket using PATCH endpoint (optimized for small changes)
   */
  private async updateTicketPartial(ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> {
    try {
      // Get the current project and ticket to determine the correct endpoint
      const currentProject = this.getCurrentProject();
      if (!currentProject) {
        throw new Error('No project selected');
      }

      // Convert date objects to ISO strings for the API
      const apiUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value instanceof Date) {
          apiUpdates[key] = value.toISOString();
        } else {
          apiUpdates[key] = value;
        }
      }

      // Add lastModified if not included
      if (!apiUpdates.lastModified) {
        apiUpdates.lastModified = new Date().toISOString();
      }


      const response = await fetch(`/api/projects/${currentProject}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiUpdates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('FileService: PATCH request failed:', response.status, errorData);
        throw new Error(`Failed to update ticket: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      // For performance, we'll update localStorage but may not reload the full ticket
      const existingTicket = await this.loadTicket(ticketCode);
      if (existingTicket) {
        const updatedTicket: Ticket = {
          ...existingTicket,
          ...updates,
          code: ticketCode,
          lastModified: new Date(apiUpdates.lastModified)
        };
        
        // Update localStorage
        await this.saveTicket(updatedTicket);
      }

      // Return a minimal ticket object with the updated info
      return {
        ...(existingTicket || {}),
        code: ticketCode,
        status: updates.status,
        lastModified: new Date(apiUpdates.lastModified)
      } as Ticket;

    } catch (error) {
      console.error('FileService: Partial update failed, falling back to full update:', error);
      // Fall back to full update if PATCH fails
      return await this.updateTicketFull(ticketCode, updates);
    }
  }

  /**
   * Update ticket using full content (existing method)
   */
  private async updateTicketFull(ticketCode: string, updates: Partial<Ticket>): Promise<Ticket> {
    const existingTicket = await this.loadTicket(ticketCode);
    if (!existingTicket) {
      console.error(`FileService: Ticket ${ticketCode} not found`);
      throw new Error(`Ticket ${ticketCode} not found`);
    }

    const updatedTicket: Ticket = {
      ...existingTicket,
      ...updates,
      code: ticketCode, // Ensure code doesn't change
      lastModified: new Date()
    };

    
    // Save to localStorage first
    await this.saveTicket(updatedTicket);
    
    // Try to save to actual markdown file if it exists
    try {
      await this.saveTicketToFile(updatedTicket);
    } catch (fileError) {
      console.warn('FileService: Failed to save ticket to file, using localStorage fallback:', fileError);
    }
    
    return updatedTicket;
  }

  /**
   * Save a ticket to its markdown file
   */
  private async saveTicketToFile(ticket: Ticket): Promise<void> {
    try {
      // Generate markdown content
      const markdownContent = this.generateMarkdownContent(ticket);
      
      // In a real application, this would make an API call to save the file
      // For now, we'll simulate it by making a fetch request
      const response = await fetch('/api/tasks/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: ticket.filePath,
          content: markdownContent
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save ticket file: ${response.statusText}`);
      }

    } catch (error) {
      console.error(`FileService: Failed to save ticket ${ticket.code} to file:`, error);
      throw error;
    }
  }

  /**
   * Generate markdown content from a ticket object
   */
  private generateMarkdownContent(ticket: Ticket): string {
    const relatedTickets = ticket.relatedTickets || [];
    const dependsOn = ticket.dependsOn || [];
    const blocks = ticket.blocks || [];

    const frontMatter = `---
code: ${ticket.code}
title: ${ticket.title}
status: ${ticket.status}
dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}
type: ${ticket.type}
priority: ${ticket.priority}
phaseEpic: ${ticket.phaseEpic}
description: ${ticket.description || ''}
rationale: ${ticket.rationale || ''}
relatedTickets: ${relatedTickets.join(', ') || ''}
dependsOn: ${dependsOn.join(', ') || ''}
blocks: ${blocks.join(', ') || ''}
assignee: ${ticket.assignee || ''}
implementationDate: ${ticket.implementationDate ? ticket.implementationDate.toISOString() : ''}
implementationNotes: ${ticket.implementationNotes || ''}
lastModified: ${ticket.lastModified?.toISOString() || new Date().toISOString()}
---

# Change Request: ${ticket.code}

## Description
${ticket.title}

## Status
**Current Status:** ${ticket.status}

## Details
- **Type:** ${ticket.type}
- **Priority:** ${ticket.priority}
- **Phase/Epic:** ${ticket.phaseEpic}
## Timeline
- **Created:** ${ticket.dateCreated?.toLocaleDateString() || 'Unknown'}
- **Last Modified:** ${ticket.lastModified?.toLocaleDateString() || 'Unknown'}
${ticket.implementationDate ? `- **Implemented:** ${ticket.implementationDate.toLocaleDateString()}` : ''}

## Related Information
${relatedTickets.length > 0 ? `- **Related Tickets:** ${relatedTickets.join(', ')}` : ''}
${dependsOn.length > 0 ? `- **Depends On:** ${dependsOn.join(', ')}` : ''}
${blocks.length > 0 ? `- **Blocks:** ${blocks.join(', ')}` : ''}
${ticket.assignee ? `- **Assignee:** ${ticket.assignee}` : ''}

${ticket.description ? `## Description
${ticket.description}` : ''}

${ticket.rationale ? `## Rationale
${ticket.rationale}` : ''}

${ticket.implementationNotes ? `## Implementation Notes
${ticket.implementationNotes}` : ''}

## Content
${ticket.content || ''}
`;

    return frontMatter;
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketCode: string): Promise<void> {
    try {
      const tickets = await this.loadAllTickets();
      const filteredTickets = tickets.filter(ticket => ticket.code !== ticketCode);

      if (this.autoSave && typeof window !== 'undefined' && window.localStorage) {
        const storedData: StoredTicket[] = filteredTickets.map(t => ({
          ticket: t,
          timestamp: Date.now()
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(storedData));
      }

      console.log(`Ticket ${ticketCode} deleted`);
    } catch (error) {
      console.error(`Failed to delete ticket ${ticketCode}:`, error);
      throw error;
    }
  }

  /**
   * Export tickets to JSON file
   */
  async exportTickets(): Promise<void> {
    try {
      const tickets = await this.loadAllTickets();
      const dataStr = JSON.stringify(tickets, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `tickets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Tickets exported successfully');
    } catch (error) {
      console.error('Failed to export tickets:', error);
      throw error;
    }
  }

  /**
   * Import tickets from JSON file
   */
  async importTickets(file: File): Promise<void> {
    try {
      const text = await file.text();
      const importedTickets: Ticket[] = JSON.parse(text);
      
      // Validate and convert date strings
      const validatedTickets = importedTickets.map(ticket => ({
        ...ticket,
        dateCreated: ticket.dateCreated ? new Date(ticket.dateCreated) : new Date(),
        implementationDate: ticket.implementationDate ? new Date(ticket.implementationDate) : undefined,
        lastModified: ticket.lastModified ? new Date(ticket.lastModified) : new Date()
      }));

      // Merge with existing tickets
      const existingTickets = await this.loadAllTickets();
      const mergedTickets = [...existingTickets];
      
      for (const importedTicket of validatedTickets) {
        const existingIndex = mergedTickets.findIndex(t => t.code === importedTicket.code);
        if (existingIndex >= 0) {
          mergedTickets[existingIndex] = importedTicket;
        } else {
          mergedTickets.push(importedTicket);
        }
      }

      // Save merged tickets
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedData: StoredTicket[] = mergedTickets.map(t => ({
          ticket: t,
          timestamp: Date.now()
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(storedData));
      }

      console.log(`Imported ${validatedTickets.length} tickets successfully`);
    } catch (error) {
      console.error('Failed to import tickets:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalTickets: number;
    totalSize: number;
    oldestTicket: Date | null;
    newestTicket: Date | null;
  }> {
    try {
      const tickets = await this.loadAllTickets();
      
      let totalSize = 0;
      let oldestTicket: Date | null = null;
      let newestTicket: Date | null = null;
      
      for (const ticket of tickets) {
        const ticketSize = JSON.stringify(ticket).length;
        totalSize += ticketSize;
        
        if (ticket.dateCreated && (!oldestTicket || ticket.dateCreated < oldestTicket)) {
          oldestTicket = ticket.dateCreated;
        }
        if (ticket.dateCreated && (!newestTicket || ticket.dateCreated > newestTicket)) {
          newestTicket = ticket.dateCreated;
        }
      }
      
      return {
        totalTickets: tickets.length,
        totalSize,
        oldestTicket,
        newestTicket
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalTickets: 0,
        totalSize: 0,
        oldestTicket: null,
        newestTicket: null
      };
    }
  }

  /**
   * Clear all stored tickets
   */
  async clearAllTickets(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.storageKey);
      }
      console.log('All tickets cleared');
    } catch (error) {
      console.error('Failed to clear tickets:', error);
      throw error;
    }
  }

  /**
   * Get mock tickets for demo purposes
   */
  private getMockTickets(): Ticket[] {
    return [
      {
        code: 'CR-A001',
        title: 'Implement user authentication system',
        status: 'In Progress',
        dateCreated: new Date('2024-01-15'),
        type: 'Feature Enhancement',
        priority: 'High',
        phaseEpic: 'Phase A (Foundation)',
        description: 'Implement a comprehensive user authentication system for the application',
        rationale: 'Users need secure access to the application',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        assignee: 'dev-team',
        implementationDate: new Date('2024-02-01'),
        implementationNotes: 'Authentication system implemented with JWT tokens',
        filePath: './tickets/CR-A001.md',
        lastModified: new Date('2024-01-20'),
        content: `---
code: CR-A001
title: Implement user authentication system
status: In Progress
dateCreated: 2024-01-15T00:00:00.000Z
type: Feature Enhancement
priority: High
phaseEpic: Phase A (Foundation)
description: Implement a comprehensive user authentication system for the application
rationale: Users need secure access to the application
relatedTickets:
dependsOn:
blocks:
assignee: dev-team
implementationDate: 2024-02-01T00:00:00.000Z
implementationNotes: Authentication system implemented with JWT tokens
lastModified: 2024-01-20T00:00:00.000Z
---

# Change Request: CR-A001

## Description
Implement a comprehensive user authentication system for the application.

## Requirements
- User registration and login
- JWT token-based authentication
- Password reset functionality
- Role-based access control
- Session management

## Implementation Notes
Authentication system implemented with JWT tokens.

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Users can log in and receive JWT tokens
- [ ] Password reset functionality works
- [ ] Role-based access control is implemented
- [ ] Sessions are properly managed`
      },
      {
        code: 'CR-A002',
        title: 'Fix responsive design issues on mobile',
        status: 'Proposed',
        dateCreated: new Date('2024-01-18'),
        type: 'Bug Fix',
        priority: 'Medium',
        phaseEpic: 'Phase A (Foundation)',
        description: 'Fix responsive design issues that occur on mobile devices',
        rationale: 'Mobile users are experiencing usability issues',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        assignee: '',
        implementationDate: undefined,
        implementationNotes: undefined,
        filePath: './tickets/CR-A002.md',
        lastModified: new Date('2024-01-18'),
        content: `---
code: CR-A002
title: Fix responsive design issues on mobile
status: Proposed
dateCreated: 2024-01-18T00:00:00.000Z
type: Bug Fix
priority: Medium
phaseEpic: Phase A (Foundation)
description: Fix responsive design issues that occur on mobile devices
rationale: Mobile users are experiencing usability issues
relatedTickets:
dependsOn:
blocks:
assignee:
implementationDate:
implementationNotes:
lastModified: 2024-01-18T00:00:00.000Z
---

# Change Request: CR-A002

## Description
Fix responsive design issues that occur on mobile devices.

## Issues Found
- Navigation menu overlaps with content on small screens
- Form fields are too close together
- Buttons are not touch-friendly
- Text is too small to read on mobile

## Implementation Notes
`
      },
      {
        code: 'CR-A003',
        title: 'Add comprehensive error handling',
        status: 'Approved',
        dateCreated: new Date('2024-01-10'),
        type: 'Technical Debt',
        priority: 'Medium',
        phaseEpic: 'Phase A (Foundation)',
        description: 'Add comprehensive error handling throughout the application',
        rationale: 'Better error handling improves user experience and debugging',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        assignee: 'dev-team',
        implementationDate: undefined,
        implementationNotes: undefined,
        filePath: './tickets/CR-A003.md',
        lastModified: new Date('2024-01-10'),
        content: `---
code: CR-A003
title: Add comprehensive error handling
status: Approved
dateCreated: 2024-01-10T00:00:00.000Z
type: Technical Debt
priority: Medium
phaseEpic: Phase A (Foundation)
description: Add comprehensive error handling throughout the application
rationale: Better error handling improves user experience and debugging
relatedTickets:
dependsOn:
blocks:
assignee: dev-team
implementationDate:
implementationNotes:
lastModified: 2024-01-10T00:00:00.000Z
---

# Change Request: CR-A003

## Description
Add comprehensive error handling throughout the application to improve user experience and system reliability.

## Areas to Improve
- API error responses
- Form validation errors
- File upload errors
- Network connection errors
- Database connection errors

## Implementation Notes
`
      },
      {
        code: 'CR-B001',
        title: 'Implement dark mode support',
        status: 'Implemented',
        dateCreated: new Date('2023-12-20'),
        type: 'Feature Enhancement',
        priority: 'Low',
        phaseEpic: 'Phase B (Enhancement)',
        description: 'Implement dark mode support for the application to improve user experience in low-light environments',
        rationale: 'Users requested dark mode for better accessibility',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        assignee: '',
        implementationDate: new Date('2024-01-05'),
        implementationNotes: 'Dark mode implemented with CSS variables',
        filePath: './tickets/CR-B001.md',
        lastModified: new Date('2024-01-05'),
        content: `---
code: CR-B001
title: Implement dark mode support
status: Implemented
dateCreated: 2023-12-20T00:00:00.000Z
type: Feature Enhancement
priority: Low
phaseEpic: Phase B (Enhancement)
description: Implement dark mode support for the application to improve user experience in low-light environments
rationale: Users requested dark mode for better accessibility
relatedTickets:
dependsOn:
blocks:
assignee:
implementationDate: 2024-01-05T00:00:00.000Z
implementationNotes: Dark mode implemented with CSS variables
lastModified: 2024-01-05T00:00:00.000Z
---

# Change Request: CR-B001

## Description
Implement dark mode support for the application to improve user experience in low-light environments.

## Features
- Dark/light theme toggle
- System preference detection
- Smooth theme transitions
- Consistent dark mode across all components

## Implementation Notes
Dark mode implemented with CSS variables.

## Acceptance Criteria
- [ ] Theme toggle button works
- [ ] System preference is respected
- [ ] All components have dark mode styles
- [ ] Theme transitions are smooth`
      }
    ];
  }
}

// Default file service instance
export const defaultFileService = new FileService({
  storageKey: 'md-tickets',
  autoSave: true
});