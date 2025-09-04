import * as fs from 'fs-extra';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { CR, CRFilters, CRData, CRType, CRStatus, Project } from '../types/index.js';

export class CRService {
  async listCRs(project: Project, filters?: CRFilters): Promise<CR[]> {
    try {
      const crFiles = await glob('*.md', { cwd: project.project.path });
      const crs: CR[] = [];

      for (const filename of crFiles) {
        try {
          const cr = await this.loadCR(project, filename);
          if (cr && this.matchesFilters(cr, filters)) {
            crs.push(cr);
          }
        } catch (error) {
          console.warn(`Failed to load CR ${filename}:`, error);
        }
      }

      // Sort by CR key (natural sort, DESC - newest/highest numbers first)
      return crs.sort((a, b) => {
        // Extract the numeric part for proper sorting (e.g., CR-A001 vs CR-A010)
        const extractNumber = (key: string) => {
          const match = key.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        
        const aNum = extractNumber(a.key);
        const bNum = extractNumber(b.key);
        
        if (aNum !== bNum) {
          return bNum - aNum; // DESC: higher numbers first
        }
        
        // Fallback to reverse string comparison if numbers are equal
        return b.key.localeCompare(a.key);
      });
    } catch (error) {
      console.error(`Failed to list CRs for project ${project.id}:`, error);
      return [];
    }
  }

  async getCR(project: Project, crKey: string): Promise<CR | null> {
    try {
      // Find the file matching the CR key
      const crFiles = await glob('*.md', { cwd: project.project.path });
      const targetFile = crFiles.find(file => 
        path.basename(file, '.md').toUpperCase().includes(crKey.toUpperCase())
      );

      if (!targetFile) {
        return null;
      }

      return await this.loadCR(project, targetFile);
    } catch (error) {
      console.error(`Failed to get CR ${crKey} for project ${project.id}:`, error);
      return null;
    }
  }

  async createCR(project: Project, crType: CRType, data: CRData): Promise<CR> {
    try {
      // Generate next CR number
      const nextNumber = await this.getNextCRNumber(project);
      const crKey = `${project.project.code}-${String(nextNumber).padStart(3, '0')}`;
      
      // Create filename slug from title
      const titleSlug = this.createSlug(data.title);
      const filename = `${crKey}-${titleSlug}.md`;
      const filePath = path.join(project.project.path, filename);

      // Ensure CR directory exists
      await fs.ensureDir(project.project.path);

      // Create CR object
      const now = new Date();
      const cr: CR = {
        key: crKey,
        title: data.title,
        status: 'Proposed',
        type: crType,
        priority: data.priority || 'Medium',
        dateCreated: now,
        lastModified: now,
        content: data.content || '',
        filePath,
        phaseEpic: data.phaseEpic,
        source: 'MCP Server',
        impact: 'Minor',
        effort: 'Low',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        relatedDocuments: []
      };

      // Generate markdown content
      const markdownContent = this.formatCRAsMarkdown(cr, data);
      
      // Write file
      await fs.writeFile(filePath, markdownContent, 'utf-8');

      // Update counter
      await this.updateCounter(project, nextNumber + 1);

      console.error(`✅ Created CR ${crKey}: ${data.title}`);
      return cr;
    } catch (error) {
      console.error(`Failed to create CR for project ${project.id}:`, error);
      throw new Error(`Failed to create CR: ${(error as Error).message}`);
    }
  }

  async updateCRStatus(project: Project, crKey: string, status: CRStatus): Promise<boolean> {
    try {
      const cr = await this.getCR(project, crKey);
      if (!cr) {
        return false;
      }

      // Read current file content
      const content = await readFile(cr.filePath, 'utf-8');
      
      // Update status in YAML frontmatter
      const updatedContent = this.updateYAMLField(content, 'status', status);
      const lastModifiedContent = this.updateYAMLField(updatedContent, 'lastModified', new Date().toISOString());

      // Write back to file
      await fs.writeFile(cr.filePath, lastModifiedContent, 'utf-8');

      console.error(`✅ Updated CR ${crKey} status to ${status}`);
      return true;
    } catch (error) {
      console.error(`Failed to update CR ${crKey} status:`, error);
      return false;
    }
  }

  async deleteCR(project: Project, crKey: string): Promise<boolean> {
    try {
      const cr = await this.getCR(project, crKey);
      if (!cr) {
        return false;
      }

      await fs.remove(cr.filePath);
      console.error(`🗑️ Deleted CR ${crKey}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete CR ${crKey}:`, error);
      return false;
    }
  }

  async getNextCRNumber(project: Project): Promise<number> {
    try {
      const counterPath = path.join(path.dirname(project.configPath), project.project.counterFile);
      
      if (await fs.pathExists(counterPath)) {
        const content = await readFile(counterPath, 'utf-8');
        const number = parseInt(content.trim(), 10);
        return isNaN(number) ? project.project.startNumber : number;
      }
      
      return project.project.startNumber;
    } catch (error) {
      console.warn(`Failed to read counter file, using start number: ${(error as Error).message}`);
      return project.project.startNumber;
    }
  }

  private async updateCounter(project: Project, newValue: number): Promise<void> {
    try {
      const counterPath = path.join(path.dirname(project.configPath), project.project.counterFile);
      await fs.writeFile(counterPath, newValue.toString(), 'utf-8');
    } catch (error) {
      console.warn(`Failed to update counter file: ${(error as Error).message}`);
    }
  }

  private async loadCR(project: Project, filename: string): Promise<CR | null> {
    try {
      const filePath = path.join(project.project.path, filename);
      const content = await readFile(filePath, 'utf-8');
      
      const frontmatter = this.parseFrontmatter(content);
      if (!frontmatter) {
        return null;
      }

      const stats = await stat(filePath);
      
      return {
        key: frontmatter.code || path.basename(filename, '.md'),
        title: frontmatter.title || 'Untitled',
        status: frontmatter.status || 'Proposed',
        type: frontmatter.type || 'Feature Enhancement',
        priority: frontmatter.priority || 'Medium',
        dateCreated: this.parseDate(frontmatter.dateCreated) || stats.birthtime,
        lastModified: this.parseDate(frontmatter.lastModified) || stats.mtime,
        content: this.extractContent(content),
        filePath,
        phaseEpic: frontmatter.phaseEpic,
        source: frontmatter.source,
        impact: frontmatter.impact,
        effort: frontmatter.effort,
        implementationDate: this.parseDate(frontmatter.implementationDate),
        implementationNotes: frontmatter.implementationNotes,
        relatedTickets: this.parseArrayField(frontmatter.relatedTickets),
        supersedes: frontmatter.supersedes,
        dependsOn: this.parseArrayField(frontmatter.dependsOn),
        blocks: this.parseArrayField(frontmatter.blocks),
        relatedDocuments: this.parseArrayField(frontmatter.relatedDocuments),
        // Additional optional attributes
        assignee: frontmatter.assignee,
        estimatedHours: frontmatter.estimatedHours ? Number(frontmatter.estimatedHours) : undefined,
        actualHours: frontmatter.actualHours ? Number(frontmatter.actualHours) : undefined,
        reviewers: this.parseArrayField(frontmatter.reviewers),
        dependencies: this.parseArrayField(frontmatter.dependencies),
        riskLevel: frontmatter.riskLevel,
        tags: this.parseArrayField(frontmatter.tags)
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

  private parseDate(dateString: any): Date | undefined {
    if (!dateString) return undefined;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString === 'string') {
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }

  private parseArrayField(field: any): string[] {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string' && field.trim()) {
      return field.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }

  private matchesFilters(cr: CR, filters?: CRFilters): boolean {
    if (!filters) return true;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(cr.status)) return false;
    }

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      if (!types.includes(cr.type)) return false;
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      if (!priorities.includes(cr.priority)) return false;
    }

    if (filters.dateRange) {
      if (filters.dateRange.start && cr.dateCreated < filters.dateRange.start) return false;
      if (filters.dateRange.end && cr.dateCreated > filters.dateRange.end) return false;
    }

    return true;
  }

  private formatCRAsMarkdown(cr: CR, data: CRData): string {
    const sections = [];

    // YAML frontmatter - only mandatory fields + optional fields with values
    sections.push('---');
    sections.push(`code: ${cr.key}`);
    sections.push(`title: ${cr.title}`);
    sections.push(`status: ${cr.status}`);
    sections.push(`dateCreated: ${cr.dateCreated.toISOString()}`);
    sections.push(`type: ${cr.type}`);
    sections.push(`priority: ${cr.priority}`);
    
    // Optional fields - only include if they have values
    if (cr.phaseEpic) sections.push(`phaseEpic: ${cr.phaseEpic}`);
    if (cr.relatedTickets && cr.relatedTickets.length > 0) sections.push(`relatedTickets: ${cr.relatedTickets.join(',')}`);
    if (cr.impact && cr.impact !== 'Minor') sections.push(`impact: ${cr.impact}`);
    if (cr.implementationDate) sections.push(`implementationDate: ${cr.implementationDate.toISOString()}`);
    if (cr.implementationNotes) sections.push(`implementationNotes: ${cr.implementationNotes}`);
    
    sections.push('---');
    sections.push('');

    // Title
    sections.push(`# ${cr.title}`);
    sections.push('');

    // Content
    if (data.content) {
      sections.push(data.content);
    } else {
      // Default template
      sections.push('## 1. Description');
      sections.push('');
      sections.push('### Problem Statement');
      if (data.description) {
        sections.push(data.description);
      } else {
        sections.push('*To be filled*');
      }
      sections.push('');
      sections.push('### Current State');
      sections.push('*To be filled*');
      sections.push('');
      sections.push('### Desired State');
      sections.push('*To be filled*');
      sections.push('');
      if (data.rationale) {
        sections.push('### Rationale');
        sections.push(data.rationale);
        sections.push('');
      }
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
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          break;
        }
      } else if (inFrontmatter && lines[i]?.startsWith(`${field}:`)) {
        lines[i] = `${field}: ${value}`;
        return lines.join('\n');
      }
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