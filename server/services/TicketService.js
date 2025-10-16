import fs from 'fs/promises';
import path from 'path';
import { generateProjectSpecificCode, getNextTicketNumber, updateTicketCounter } from '../utils/ticketNumbering.js';

/**
 * Service layer for ticket/CR management operations
 */
export class TicketService {
  constructor(projectDiscovery) {
    this.projectDiscovery = projectDiscovery;
  }

  /**
   * Get CRs for a specific project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of CR objects
   */
  async getProjectCRs(projectId) {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    return await this.projectDiscovery.getProjectCRs(project.project.path);
  }

  /**
   * Get specific CR from a project
   * @param {string} projectId - Project ID
   * @param {string} crId - CR ID or code
   * @returns {Promise<Object>} CR object
   */
  async getCR(projectId, crId) {
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
   * @param {string} projectId - Project ID
   * @param {Object} crData - CR data
   * @returns {Promise<Object>} Created CR info
   */
  async createCR(projectId, crData) {
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
    let crCode;
    if (code) {
      crCode = code;
    } else {
      crCode = generateProjectSpecificCode(project, config, nextNumber);
    }

    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const filename = `${crCode}-${titleSlug}.md`;

    // MDT-064: Create CR content with YAML frontmatter format
    const crContent = `---
code: ${crCode}
title: ${title}
status: Proposed
dateCreated: ${new Date().toISOString()}
type: ${type}
priority: ${priority || 'Medium'}
phaseEpic: Phase A (Foundation)
source: User Request
impact: Medium
---

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
    const crPath = path.join(project.project.path, config.project.path || 'docs/CRs');
    await fs.mkdir(crPath, { recursive: true });
    const crFilePath = path.join(crPath, filename);
    await fs.writeFile(crFilePath, crContent, 'utf8');

    // Update counter
    const counterPath = path.join(project.project.path, config.project.counterFile || '.mdt-next');
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
   * @param {string} projectId - Project ID
   * @param {string} crId - CR ID or code
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Success status
   */
  async updateCRPartial(projectId, crId, updates) {
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
    const updatedFields = [];
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
   * @param {string} projectId - Project ID
   * @param {string} crId - CR ID or code
   * @param {string} content - Full CR content
   * @returns {Promise<Object>} Success status
   */
  async updateCR(projectId, crId, content) {
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
   * @param {string} projectId - Project ID
   * @param {string} crId - CR ID or code
   * @returns {Promise<Object>} Success status
   */
  async deleteCR(projectId, crId) {
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
