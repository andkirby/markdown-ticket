import * as fs from 'fs';
import * as path from 'path';
import type { Ticket } from '../models/Ticket.js';
import { normalizeTicket } from '../models/Ticket.js';
import { PATTERNS } from '../utils/constants.js';
import { CRService } from './CRService.js';

/**
 * Unified Markdown Processing Service
 * Handles parsing and generation of markdown files with YAML frontmatter
 */
export class MarkdownService {
  
  /**
   * Parse markdown file with YAML frontmatter
   */
  static async parseMarkdownFile(filePath: string, projectPath?: string): Promise<Ticket | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const ticket = await this.parseMarkdownContent(content, filePath, projectPath);
      
      if (ticket) {
        // Get file stats for dates if not in frontmatter
        const stats = fs.statSync(filePath);
        
        if (!ticket.dateCreated) {
          ticket.dateCreated = stats.birthtime || stats.ctime;
        }
        if (!ticket.lastModified) {
          ticket.lastModified = stats.mtime;
        }
      }
      
      return ticket;
    } catch (error) {
      console.error(`Error parsing markdown file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse markdown content with YAML frontmatter
   */
  static async parseMarkdownContent(content: string, filePath?: string, projectPath?: string): Promise<Ticket | null> {
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

      // MDT-064: Extract title from H1 header with fallback to filename
      // H1 is the authoritative source, frontmatter.title is for compatibility
      let extractedTitle = metadata.title || 'Untitled';
      if (projectPath && filePath) {
        try {
          extractedTitle = await CRService.extractTitle(projectPath, filePath, markdownContent);
        } catch (error) {
          console.warn(`Failed to extract title from H1 for ${filePath}:`, error);
          // Fallback to frontmatter title
        }
      }

      // Process content to hide additional H1 headers (keep only first)
      const processedContent = CRService.processContentForDisplay(markdownContent.trim());

      // Create raw ticket object
      const rawTicket = {
        ...metadata,
        title: extractedTitle, // Use H1-extracted title as authoritative
        content: processedContent,
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
  static async scanMarkdownFiles(dirPath: string, projectPath?: string): Promise<Ticket[]> {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(dirPath, file));

      const tickets: Ticket[] = [];

      for (const filePath of files) {
        const ticket = await this.parseMarkdownFile(filePath, projectPath);
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
