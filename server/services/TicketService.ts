import fs from 'fs/promises';
import path from 'path';
import { getNextTicketNumber } from '../utils/ticketNumbering';

// Type definitions

interface ProjectConfig {
  code: string;
  project?: {
    id?: string;
    name?: string;
    code?: string;
    path?: string;
    startNumber?: number;
    counterFile?: string;
    description?: string;
    repository?: string;
  };
}

interface Ticket {
  code: string;
  filePath: string;
}

interface CRData {
  code?: string;
  title: string;
  type: string;
  priority?: string;
  description?: string;
}

interface CreateCRResult {
  success: boolean;
  message: string;
  crCode: string;
  filename: string;
  path: string;
}

interface UpdateCRResult {
  success: boolean;
  message: string;
  updatedFields: string[];
  projectId: string;
  crId: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  filename?: string;
  path?: string;
}

interface DeleteResult {
  success: boolean;
  message: string;
  filename: string;
}

interface ProjectDiscovery {
  getAllProjects(): Promise<any[]>; // Use any for now to avoid type conflicts
  getProjectConfig(projectPath: string): ProjectConfig | null;
  getProjectCRs(projectPath: string): Promise<Ticket[]>;
}

/**
 * Service layer for ticket/CR management operations
 */
export class TicketService {
  private projectDiscovery: ProjectDiscovery;

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery;
  }

  /**
   * Get CRs for a specific project
   * @param projectId - Project ID
   * @returns Array of CR objects
   */
  async getProjectCRs(projectId: string): Promise<Ticket[]> {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    return await this.projectDiscovery.getProjectCRs(project.project.path);
  }

  /**
   * Get specific CR from a project
   * @param projectId - Project ID
   * @param crId - CR ID or code
   * @returns CR object
   */
  async getCR(projectId: string, crId: string): Promise<Ticket> {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const crs = await this.projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));

    if (!cr) {
      throw new Error('CR not found');
    }

    return cr;
  }

  /**
   * Create new CR in a project
   * @param projectId - Project ID
   * @param crData - CR data
   * @returns Created CR info
   */
  async createCR(projectId: string, crData: CRData): Promise<CreateCRResult> {
    const { code, title, type, priority, description } = crData;

    if (!title || !type) {
      throw new Error('Title and type are required');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const config = this.projectDiscovery.getProjectConfig(project.project.path);
    if (!config) {
      throw new Error('Project configuration not found');
    }

    // Get next CR number using smart logic
    const nextNumber = await getNextTicketNumber(project.project.path, config.code);

    // Generate CR code based on project configuration or use provided code
    let crCode: string;
    if (code) {
      crCode = code;
    } else {
      // Simple code generation fallback
      const projectCode = config.code || project.id.toUpperCase();
      crCode = `${projectCode}-${nextNumber.toString().padStart(3, '0')}`;
    }

    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${crCode}-${titleSlug}.md`;

    // MDT-064: Create CR content with H1 as authoritative source
    const crContent = `- **Code**: ${crCode}
- **Title/Summary**: ${title}
- **Status**: Proposed
- **Date Created**: ${new Date().toISOString().split('T')[0]}
- **Type**: ${type}
- **Priority**: ${priority || 'Medium'}
- **Phase/Epic**: Phase A (Foundation)

# ${title}

## 1. Description

### Problem Statement
${description || 'Please provide a detailed problem statement.'}

### Current State
Please describe the current behavior/implementation.

### Desired State
Please describe what the new behavior/implementation should be.

### Rationale
Please explain why this change is important and why now.

### Impact Areas
Please list what parts of the system will be affected.

## 2. Solution Analysis

### Approaches Considered
Please list alternative solutions that were evaluated.

### Trade-offs Analysis
Please provide pros/cons of different approaches.

### Decision Factors
Please list technical constraints, timeline, resources, user impact.

### Chosen Approach
Please explain why this solution was selected.

### Rejected Alternatives
Please explain why other approaches were not chosen.

## 3. Implementation Specification

### Technical Requirements
Please list specific technical changes needed.

### UI/UX Changes
Please describe user interface modifications (if applicable).

### API Changes
Please describe new endpoints, modified responses, breaking changes (if applicable).

### Database Changes
Please describe schema modifications, data migrations (if applicable).

### Configuration
Please describe new settings, environment variables, deployment changes (if applicable).

## 4. Acceptance Criteria

Please list specific, testable conditions that must be met for completion:
- [ ] Condition 1
- [ ] Condition 2
- [ ] Condition 3

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References

### Related Tasks
- Link to specific implementation tasks

### Code Changes
- Reference commits, pull requests, or branches

### Documentation Updates
- Links to updated documentation sections

### Related CRs
- Cross-references to dependent or related change requests
`;

    // Write CR file
    const crPath = path.join(project.project.path, config.project?.path || 'docs/CRs');
    await fs.mkdir(crPath, { recursive: true });
    const crFilePath = path.join(crPath, filename);
    await fs.writeFile(crFilePath, crContent, 'utf8');

    // Update counter
    const counterPath = path.join(project.project.path, config.project?.counterFile || '.mdt-next');
    await fs.writeFile(counterPath, String(nextNumber + 1), 'utf8');

    return {
      success: true,
      message: 'CR created successfully',
      crCode,
      filename,
      path: crFilePath
    };
  }

  /**
   * Update CR partially (specific fields)
   * @param projectId - Project ID
   * @param crId - CR ID or code
   * @param updates - Fields to update
   * @returns Success status
   */
  async updateCRPartial(projectId: string, crId: string, updates: Record<string, any>): Promise<UpdateCRResult> {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No fields provided for update');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const crs = await this.projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));

    if (!cr) {
      throw new Error('CR not found');
    }

    // Read current content
    const currentContent = await fs.readFile(cr.filePath, 'utf8');

    // Parse YAML frontmatter
    const lines = currentContent.split('\n');

    // Find the frontmatter boundaries
    let frontmatterStart = -1;
    let frontmatterEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        if (frontmatterStart === -1) {
          frontmatterStart = i;
        } else if (frontmatterEnd === -1) {
          frontmatterEnd = i;
          break;
        }
      }
    }

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      throw new Error('Invalid ticket format - no YAML frontmatter found');
    }

    // Extract and update frontmatter
    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const updatedFrontmatter = [...frontmatterLines];

    // Auto-add implementation fields when status changes to Implemented/Partially Implemented
    if (updates.status === 'Implemented' || updates.status === 'Partially Implemented') {
      if (!updates.implementationDate) {
        updates.implementationDate = new Date().toISOString();
      }
      if (!updates.implementationNotes) {
        updates.implementationNotes = `Status changed to ${updates.status} on ${new Date().toLocaleDateString()}`;
      }
    }

    // Update only the specified fields
    const updatedFields: string[] = [];
    for (const [key, value] of Object.entries(updates)) {
      // Special handling for date fields
      let processedValue = value;
      if (key.includes('Date') && typeof value === 'string' && !value.includes('T')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          processedValue = date.toISOString();
        }
      } else if (key === 'lastModified') {
        // Skip manual lastModified - will be derived from file modification time
        continue;
      }

      const existingIndex = updatedFrontmatter.findIndex(line =>
        line.trim().startsWith(key + ':')
      );

      if (existingIndex >= 0) {
        updatedFrontmatter[existingIndex] = `${key}: ${processedValue}`;
      } else {
        updatedFrontmatter.push(`${key}: ${processedValue}`);
      }
      updatedFields.push(key);
    }

    // Reconstruct the file content
    const updatedContent = [
      '---',
      ...updatedFrontmatter,
      '---',
      '',
      ...lines.slice(frontmatterEnd + 1)
    ].join('\n');

    // Write back to file
    await fs.writeFile(cr.filePath, updatedContent, 'utf8');

    return {
      success: true,
      message: 'CR updated successfully',
      updatedFields,
      projectId,
      crId
    };
  }

  /**
   * Update CR completely (full content)
   * @param projectId - Project ID
   * @param crId - CR ID or code
   * @param content - Full CR content
   * @returns Success status
   */
  async updateCR(projectId: string, crId: string, content: string): Promise<UpdateResult> {
    if (!content) {
      throw new Error('Content is required');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const crs = await this.projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));

    if (!cr) {
      throw new Error('CR not found');
    }

    // Update CR file
    await fs.writeFile(cr.filePath, content, 'utf8');

    return {
      success: true,
      message: 'CR updated successfully',
      filename: path.basename(cr.filePath),
      path: cr.filePath
    };
  }

  /**
   * Delete CR from a project
   * @param projectId - Project ID
   * @param crId - CR ID or code
   * @returns Success status
   */
  async deleteCR(projectId: string, crId: string): Promise<DeleteResult> {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const crs = await this.projectDiscovery.getProjectCRs(project.project.path);
    const cr = crs.find(c => c.code === crId || (c.filePath && c.filePath.includes(crId)));

    if (!cr) {
      throw new Error('CR not found');
    }

    // Delete CR file
    await fs.unlink(cr.filePath);

    return {
      success: true,
      message: 'CR deleted successfully',
      filename: path.basename(cr.filePath)
    };
  }
}