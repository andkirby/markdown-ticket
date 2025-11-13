import * as fs from 'fs-extra';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { Ticket, TicketFilters, TicketData, normalizeTicket, arrayToString} from '@mdt/shared/models/Ticket.js';
import { CRStatus } from '@mdt/shared/models/Types.js';
import { Project } from '@mdt/shared/models/Project.js';
// @ts-ignore
import { ProjectService } from '@mdt/shared/services/ProjectService.js';
// Use shared services for consistency
// @ts-ignore
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js';
// Import shared service with different name to avoid conflict
// @ts-ignore
import { CRService as SharedCRService } from '@mdt/shared/services/CRService.js';

export class CRService {
  private projectService = new ProjectService();

  private async getCRPath(project: Project): Promise<string> {
    try {
      const config = this.projectService.getProjectConfig(project.project.path);
      if (!config || !config.project) {
        return path.resolve(project.project.path, 'docs/CRs');
      }

      const crPath = config.project.path || 'docs/CRs';
      return path.resolve(project.project.path, crPath);
    } catch (error) {
      console.warn(`Failed to get CR path config for project ${project.id}, using default:`, error);
      return path.resolve(project.project.path, 'docs/CRs');
    }
  }

  async listCRs(project: Project, filters?: TicketFilters): Promise<Ticket[]> {
    try {
      // Use shared ProjectService to get CRs with correct path resolution
      const crs = await this.projectService.getProjectCRs(project.project.path);

      // Apply filters if provided
      let filteredCRs = crs;
      if (filters) {
        filteredCRs = crs.filter(cr => this.matchesFilters(cr, filters));
      }

      // Sort by ticket code (natural sort, DESC - newest/highest numbers first)
      return filteredCRs.sort((a, b) => {
        // Extract the numeric part for proper sorting (e.g., CR-A001 vs CR-A010)
        const extractNumber = (code: string) => {
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };

        const aNum = extractNumber(a.code);
        const bNum = extractNumber(b.code);

        if (aNum !== bNum) {
          return bNum - aNum; // DESC: higher numbers first
        }

        // Fallback to reverse string comparison if numbers are equal
        return b.code.localeCompare(a.code);
      });
    } catch (error) {
      console.error(`Failed to list CRs for project ${project.id}:`, error);
      return [];
    }
  }

  async getCR(project: Project, key: string): Promise<Ticket | null> {
    try {
      // Use shared ProjectService to get all CRs with correct path resolution
      const crs = await this.projectService.getProjectCRs(project.project.path);

      // Find the CR matching the key (case-insensitive)
      const targetCR = crs.find(cr =>
        cr.code.toUpperCase() === key.toUpperCase()
      );

      if (!targetCR) {
        console.warn(`CR ${key} not found among ${crs.length} CRs in project ${project.id}`);
        return null;
      }

      return targetCR;
    } catch (error) {
      console.error(`Failed to get CR ${key} for project ${project.id}:`, error);
      return null;
    }
  }

  async createCR(project: Project, crType: string, data: TicketData): Promise<Ticket> {
    try {
      // Generate next CR number
      const nextNumber = await this.getNextCRNumber(project);
      const crKey = `${project.project.code}-${String(nextNumber).padStart(3, '0')}`;
      
      // Get the correct CR path from config
      const crPath = await this.getCRPath(project);

      // Create filename slug from title
      const titleSlug = this.createSlug(data.title);
      const filename = `${crKey}-${titleSlug}.md`;
      const filePath = path.join(crPath, filename);

      // Ensure CR directory exists
      await fs.ensureDir(crPath);

      // Create ticket object using shared service
      const ticket = SharedCRService.createTicket(data, crKey, crType, filePath);

      // Generate markdown content
      const markdownContent = this.formatCRAsMarkdown(ticket, data);
      

      
      // Write file (fs-extra uses outputFile for creating files with directory creation)
      await fs.outputFile(filePath, markdownContent, 'utf-8');

      // Verify file was created
      const fileExists = await fs.pathExists(filePath);
      if (fileExists) {
        const writtenContent = await readFile(filePath, 'utf-8');
      }

      // Update counter
      await this.updateCounter(project, nextNumber + 1);

      console.error(`✅ Created CR ${crKey}: ${data.title}`);
      return ticket;
    } catch (error) {
      console.error(`Failed to create CR for project ${project.id}:`, error);
      throw new Error(`Failed to create CR: ${(error as Error).message}`);
    }
  }

  async updateCRStatus(project: Project, key: string, status: CRStatus): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key);
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`);
      }

      // Validate status transition
      this.validateStatusTransition(cr.status, status);

      // Read current file content
      const content = await readFile(cr.filePath, 'utf-8');
      
      // Update status in YAML frontmatter
      const updatedContent = this.updateYAMLField(content, 'status', status);
      // lastModified will be automatically set from file modification time

      // Write back to file
      await fs.outputFile(cr.filePath, updatedContent, 'utf-8');

      console.error(`✅ Updated CR ${key} status to ${status}`);
      return true;
    } catch (error) {
      // Enhanced error handling with specific failure types
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Failed to update CR '${key}': File not found or deleted`);
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Failed to update CR '${key}': Permission denied. Check file permissions`);
        }
        if (error.message.includes('EBUSY') || error.message.includes('EMFILE')) {
          throw new Error(`Failed to update CR '${key}': File locked or in use by another process`);
        }
        if (error.message.includes('Invalid status transition')) {
          throw error; // Re-throw validation errors as-is
        }
        if (error.message.includes('not found')) {
          throw error; // Re-throw CR not found errors as-is
        }
        // Generic file system or parsing errors
        throw new Error(`Failed to update CR '${key}': ${error.message}`);
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`);
    }
  }

  async updateCRAttrs(project: Project, key: string, attributes: Partial<TicketData>): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key);
      if (!cr) {
        throw new Error(`CR '${key}' not found in project '${project.id}'`);
      }

      // Read current file content
      const content = await readFile(cr.filePath, 'utf-8');
      let updatedContent = content;

      // Update each attribute in YAML frontmatter
      for (const [field, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
          // Convert arrays to comma-separated strings for YAML
          const stringValue = Array.isArray(value) ? value.join(',') : String(value);
          updatedContent = this.updateYAMLField(updatedContent, field, stringValue);
        }
      }

      // Write back to file
      await fs.outputFile(cr.filePath, updatedContent, 'utf-8');

      console.error(`✅ Updated CR ${key} attributes`);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Failed to update CR '${key}': File not found or deleted`);
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Failed to update CR '${key}': Permission denied. Check file permissions`);
        }
        if (error.message.includes('not found')) {
          throw error; // Re-throw CR not found errors as-is
        }
        throw new Error(`Failed to update CR '${key}': ${error.message}`);
      }
      throw new Error(`Failed to update CR '${key}': Unknown error occurred`);
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'Proposed': ['Approved', 'Rejected'],
      'Approved': ['In Progress', 'Rejected'],
      'In Progress': ['Implemented', 'Approved', 'On Hold'], // Can pause work
      'Implemented': ['In Progress'], // Allow reopening if issues found
      'Rejected': ['Proposed'], // Allow re-proposing rejected CRs
      'On Hold': ['In Progress', 'Approved'], // Can resume or go back to approved
      'Superseded': [], // Terminal state
      'Deprecated': [], // Terminal state
      'Duplicate': [], // Terminal state
      'Partially Implemented': ['Implemented', 'In Progress'] // Can be completed or continued
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      const validOptions = allowedTransitions.join(', ');
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Valid transitions from '${currentStatus}': ${validOptions}`);
    }
  }

  async deleteCR(project: Project, key: string): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key);
      if (!cr) {
        return false;
      }

      await fs.remove(cr.filePath);
      console.error(`🗑️ Deleted CR ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete CR ${key}:`, error);
      return false;
    }
  }

  async getNextCRNumber(project: Project): Promise<number> {
    try {
      // Get the correct CR directory path
      const crPath = await this.getCRPath(project);

      // Scan existing CR files to find the highest number
      const crFiles = await glob('*.md', { cwd: crPath });
      let highestExistingNumber = 0;

      for (const filename of crFiles) {
        const match = filename.match(new RegExp(`${project.project.code}-(\\d+)-`, 'i'));
        if (match) {
          const number = parseInt(match[1], 10);
          if (!isNaN(number) && number > highestExistingNumber) {
            highestExistingNumber = number;
          }
        }
      }
      
      // Also check counter file
      let counterNumber = project.project.startNumber || 1;
      const counterPath = path.join(path.dirname(project.configPath || project.project.path), project.project.counterFile || '.mdt-next');
      if (await fs.pathExists(counterPath)) {
        const content = await readFile(counterPath, 'utf-8');
        const number = parseInt(content.trim(), 10);
        if (!isNaN(number)) {
          counterNumber = number;
        }
      }
      
      // Use the higher of the two (existing files + 1, or counter file)
      const nextNumber = Math.max(highestExistingNumber + 1, counterNumber);
      
      return nextNumber;
    } catch (error) {
      console.warn(`Failed to get next CR number: ${(error as Error).message}`);
      return project.project.startNumber || 1;
    }
  }

  private async updateCounter(project: Project, newValue: number): Promise<void> {
    try {
      const counterPath = path.join(path.dirname(project.configPath || project.project.path), project.project.counterFile || '.mdt-next');
      await fs.outputFile(counterPath, newValue.toString(), 'utf-8');
    } catch (error) {
      console.warn(`Failed to update counter file: ${(error as Error).message}`);
    }
  }

  private async loadCR(project: Project, filename: string): Promise<Ticket | null> {
    try {
      const filePath = path.join(project.project.path, filename);
      const content = await readFile(filePath, 'utf-8');
      
      const frontmatter = this.parseFrontmatter(content);
      if (!frontmatter) {
        return null;
      }

      const stats = await stat(filePath);

      return {
        code: frontmatter.code || path.basename(filename, '.md'),
        title: frontmatter.title || 'Untitled',
        status: frontmatter.status || 'Proposed',
        type: frontmatter.type || 'Feature Enhancement',
        priority: frontmatter.priority || 'Medium',
        dateCreated: this.parseDate(frontmatter.dateCreated) || stats.birthtime,
        lastModified: this.parseDate(frontmatter.lastModified) || stats.mtime,
        content: this.extractContent(content),
        filePath,
        phaseEpic: frontmatter.phaseEpic,
        implementationDate: this.parseDate(frontmatter.implementationDate),
        implementationNotes: frontmatter.implementationNotes,
        relatedTickets: SharedCRService.parseArrayField(frontmatter.relatedTickets),
        dependsOn: SharedCRService.parseArrayField(frontmatter.dependsOn),
        blocks: SharedCRService.parseArrayField(frontmatter.blocks),
        assignee: frontmatter.assignee
      };
    } catch (error) {
      console.warn(`Failed to load CR ${filename}:`, error);
      return null;
    }
  }

  private parseFrontmatter(content: string): Record<string, any> | null {
    const lines = content.split('\n');
    
    if (lines[0]?.trim() !== '---') {
      return null;
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return null;
    }

    const frontmatterLines = lines.slice(1, endIndex);
    const frontmatter: Record<string, any> = {};

    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) {
          frontmatter[key] = value;
        }
      }
    }

    return frontmatter;
  }

  private extractContent(content: string): string {
    const lines = content.split('\n');
    let startIndex = 0;
    let foundSecondDelimiter = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        if (i === 0) {
          continue; // First delimiter
        } else {
          startIndex = i + 1;
          foundSecondDelimiter = true;
          break;
        }
      }
    }
    
    if (!foundSecondDelimiter) {
      return content;
    }
    
    return lines.slice(startIndex).join('\n').trim();
  }

  private parseDate(dateString: any): Date | null {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString === 'string') {
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  private matchesFilters(ticket: Ticket, filters?: TicketFilters): boolean {
    if (!filters) return true;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(ticket.status)) return false;
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      if (!types.includes(ticket.type)) return false;
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      if (!priorities.includes(ticket.priority)) return false;
    }

    if (filters.dateRange) {
      if (filters.dateRange.start && ticket.dateCreated && ticket.dateCreated < filters.dateRange.start) return false;
      if (filters.dateRange.end && ticket.dateCreated && ticket.dateCreated > filters.dateRange.end) return false;
    }

    return true;
  }

  private formatCRAsMarkdown(ticket: Ticket, data: TicketData): string {
    const sections = [];

    // YAML frontmatter - only mandatory fields + optional fields with values
    sections.push('---');
    sections.push(`code: ${ticket.code}`);
    sections.push(`title: ${ticket.title}`);
    sections.push(`status: ${ticket.status}`);
    sections.push(`dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}`);
    sections.push(`type: ${ticket.type}`);
    sections.push(`priority: ${ticket.priority}`);

    // Optional fields - only include if they have values
    if (ticket.phaseEpic) sections.push(`phaseEpic: ${ticket.phaseEpic}`);
    if (ticket.relatedTickets && ticket.relatedTickets.length > 0) sections.push(`relatedTickets: ${arrayToString(ticket.relatedTickets)}`);
    if (ticket.dependsOn && ticket.dependsOn.length > 0) sections.push(`dependsOn: ${arrayToString(ticket.dependsOn)}`);
    if (ticket.blocks && ticket.blocks.length > 0) sections.push(`blocks: ${arrayToString(ticket.blocks)}`);
    if (ticket.assignee) sections.push(`assignee: ${ticket.assignee}`);
    if (ticket.implementationDate) sections.push(`implementationDate: ${ticket.implementationDate.toISOString()}`);
    if (ticket.implementationNotes) sections.push(`implementationNotes: ${ticket.implementationNotes}`);

    sections.push('---');
    sections.push('');

    // Content
    if (data.content) {
      // MDT-064: Auto-generate H1 from title parameter if content doesn't start with H1
      if (!data.content.trim().startsWith('# ')) {
        sections.push(`# ${ticket.title}`);
        sections.push('');
        sections.push(data.content);
      } else {
        sections.push(data.content);
      }
    } else {
      // Default template with auto-generated H1
      sections.push(`# ${ticket.title}`);
      sections.push('');
      sections.push('## 1. Description');
      sections.push('');
      sections.push('### Problem Statement');
      sections.push('*To be filled*');
      sections.push('');
      sections.push('### Current State');
      sections.push('*To be filled*');
      sections.push('');
      sections.push('### Desired State');
      sections.push('*To be filled*');
      sections.push('');
      sections.push('### Rationale');
      sections.push('*To be filled*');
      sections.push('');
      if (data.impactAreas && data.impactAreas.length > 0) {
        sections.push('### Impact Areas');
        data.impactAreas.forEach(area => sections.push(`- ${area}`));
        sections.push('');
      }
      sections.push('## 2. Solution Analysis');
      sections.push('*To be filled during implementation*');
      sections.push('');
      sections.push('## 3. Implementation Specification');
      sections.push('*To be filled during implementation*');
      sections.push('');
      sections.push('## 4. Acceptance Criteria');
      sections.push('*To be filled during implementation*');
      sections.push('');
      sections.push('## 5. Implementation Notes');
      sections.push('*To be filled during/after implementation*');
      sections.push('');
      sections.push('## 6. References');
      sections.push('*To be filled during implementation*');
    }

    return sections.join('\n');
  }

  private updateYAMLField(content: string, field: string, value: string): string {
    const lines = content.split('\n');
    
    // Find the YAML frontmatter section
    let inFrontmatter = false;
    let frontmatterStart = -1;
    let frontmatterEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          frontmatterStart = i;
        } else {
          frontmatterEnd = i;
          break;
        }
      } else if (inFrontmatter && lines[i]?.startsWith(`${field}:`)) {
        // Update existing field
        lines[i] = `${field}: ${value}`;
        return lines.join('\n');
      }
    }

    // If field doesn't exist, add it before the closing ---
    if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
      lines.splice(frontmatterEnd, 0, `${field}: ${value}`);
      return lines.join('\n');
    }

    return content;
  }

  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}