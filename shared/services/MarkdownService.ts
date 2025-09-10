import fs from 'fs';
import path from 'path';
import { Ticket, normalizeTicket } from '../models/Ticket';
import { PATTERNS } from '../utils/constants';

/**
 * Unified Markdown Processing Service
 * Handles parsing and generation of markdown files with YAML frontmatter
 */
export class MarkdownService {
  
  /**
   * Parse markdown file with YAML frontmatter
   */
  static parseMarkdownFile(filePath: string): Ticket | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseMarkdownContent(content, filePath);
    } catch (error) {
      console.error(`Error parsing markdown file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse markdown content with YAML frontmatter
   */
  static parseMarkdownContent(content: string, filePath?: string): Ticket | null {
    try {
      const frontmatterMatch = content.match(PATTERNS.YAML_FRONTMATTER);
      
      if (!frontmatterMatch) {
        return null;
      }

      const yamlContent = frontmatterMatch[1];
      const markdownContent = frontmatterMatch[2];

      // Parse YAML frontmatter (using simple parsing for now)
      const metadata = this.parseYamlFrontmatter(yamlContent);
      
      if (!metadata) {
        return null;
      }

      // Create raw ticket object
      const rawTicket = {
        ...metadata,
        content: markdownContent.trim(),
        filePath: filePath || ''
      };

      // Normalize and return
      return normalizeTicket(rawTicket);
    } catch (error) {
      console.error('Error parsing markdown content:', error);
      return null;
    }
  }

  /**
   * Generate markdown content with YAML frontmatter
   */
  static generateMarkdownContent(ticket: Ticket): string {
    const frontmatter = this.generateYamlFrontmatter(ticket);
    return `---\n${frontmatter}\n---\n\n${ticket.content}`;
  }

  /**
   * Write ticket to markdown file
   */
  static writeMarkdownFile(filePath: string, ticket: Ticket): void {
    try {
      const content = this.generateMarkdownContent(ticket);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Error writing markdown file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Simple YAML frontmatter parser
   */
  private static parseYamlFrontmatter(yamlContent: string): Record<string, any> | null {
    try {
      const result: Record<string, any> = {};
      const lines = yamlContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;

        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Parse dates
        if (key.includes('Date') || key.includes('Modified') || key.includes('Created')) {
          const dateValue = new Date(value);
          result[key] = isNaN(dateValue.getTime()) ? value : dateValue;
        } else {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      console.error('Error parsing YAML frontmatter:', error);
      return null;
    }
  }

  /**
   * Generate YAML frontmatter from ticket
   */
  private static generateYamlFrontmatter(ticket: Ticket): string {
    const lines: string[] = [];

    // Core fields
    if (ticket.code) lines.push(`code: ${ticket.code}`);
    if (ticket.title) lines.push(`title: ${ticket.title}`);
    if (ticket.status) lines.push(`status: ${ticket.status}`);
    if (ticket.type) lines.push(`type: ${ticket.type}`);
    if (ticket.priority) lines.push(`priority: ${ticket.priority}`);

    // Dates
    if (ticket.dateCreated) {
      lines.push(`dateCreated: ${ticket.dateCreated.toISOString()}`);
    }
    if (ticket.lastModified) {
      lines.push(`lastModified: ${ticket.lastModified.toISOString()}`);
    }
    if (ticket.implementationDate) {
      lines.push(`implementationDate: ${ticket.implementationDate.toISOString()}`);
    }

    // Optional fields
    if (ticket.phaseEpic) lines.push(`phaseEpic: ${ticket.phaseEpic}`);
    if (ticket.description) lines.push(`description: ${ticket.description}`);
    if (ticket.rationale) lines.push(`rationale: ${ticket.rationale}`);
    if (ticket.assignee) lines.push(`assignee: ${ticket.assignee}`);
    if (ticket.implementationNotes) lines.push(`implementationNotes: ${ticket.implementationNotes}`);

    // Relationship fields
    if (ticket.relatedTickets.length > 0) {
      lines.push(`relatedTickets: ${ticket.relatedTickets.join(', ')}`);
    }
    if (ticket.dependsOn.length > 0) {
      lines.push(`dependsOn: ${ticket.dependsOn.join(', ')}`);
    }
    if (ticket.blocks.length > 0) {
      lines.push(`blocks: ${ticket.blocks.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Scan directory for markdown files
   */
  static scanMarkdownFiles(dirPath: string): Ticket[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(dirPath, file));

      const tickets: Ticket[] = [];
      
      for (const filePath of files) {
        const ticket = this.parseMarkdownFile(filePath);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets;
    } catch (error) {
      console.error(`Error scanning markdown files in ${dirPath}:`, error);
      return [];
    }
  }
}
