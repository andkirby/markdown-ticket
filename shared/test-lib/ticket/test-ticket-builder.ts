/**
 * Test Ticket Builder - Simplified ticket creation for testing
 *
 * Extracted from ProjectFactory to provide focused test ticket creation
 * with counter management and slug generation.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { withRetry } from '../utils/retry-helper.js';
import type { CRType, CRStatus, CRPriority } from '../../models/Types.js';

/** Test CR data structure */
export interface TestCRData {
  title: string;
  type: CRType;
  status?: CRStatus;
  priority?: CRPriority;
  phaseEpic?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  content: string;
}

/** Result of creating a test CR */
export interface TestCRResult {
  success: boolean;
  crCode?: string;
  filePath?: string;
  error?: string;
}

/** Builder for creating test tickets with counter management */
export class TestTicketBuilder {
  private projectsDir: string;
  private projectConfigs: Map<string, { ticketsPath?: string }> = new Map();

  constructor(projectsDir: string) {
    this.projectsDir = projectsDir;
  }

  /** Register a project configuration */
  registerProject(projectCode: string, ticketsPath?: string): void {
    this.projectConfigs.set(projectCode, { ticketsPath });
  }

  /** Create a test ticket with counter */
  async createTicket(projectCode: string, ticketData: TestCRData): Promise<TestCRResult> {
    const projectPath = join(this.projectsDir, projectCode);
    if (!existsSync(projectPath)) return { success: false, error: `Project ${projectCode} not found` };

    try {
      const nextNumber = this.getNextNumber(projectPath);
      const crCode = this.generateTicketCode(projectCode, nextNumber);
      const titleSlug = this.createSlug(ticketData.title);
      const filename = `${crCode}-${titleSlug}.md`;
      const projectConfig = this.projectConfigs.get(projectCode);
      const crPath = join(projectPath, projectConfig?.ticketsPath || 'docs/CRs', filename);

      // Build CR content using simple embedded template
      const content = `# ${ticketData.title}

## 1. Description
${ticketData.content}

## 2. Rationale
To be filled...

## 3. Solution Analysis
To be filled...

## 4. Implementation Specification
To be filled...

## 5. Acceptance Criteria
To be filled...
`;

      // Create full markdown with frontmatter
      const fullContent = `---
code: ${crCode}
title: ${ticketData.title}
status: ${ticketData.status || 'Proposed'}
type: ${ticketData.type}
priority: ${ticketData.priority || 'Medium'}
${ticketData.phaseEpic ? `phaseEpic: ${ticketData.phaseEpic}` : ''}
${ticketData.dependsOn ? `dependsOn: ${ticketData.dependsOn}` : ''}
${ticketData.blocks ? `blocks: ${ticketData.blocks}` : ''}
${ticketData.assignee ? `assignee: ${ticketData.assignee}` : ''}
---

${content}`;

      // Write CR file with retry
      await withRetry(
        async () => writeFileSync(crPath, fullContent, 'utf8'),
        {
          logContext: `TestTicketBuilder.writeCRFile(${crCode})`,
          retryableErrors: ['EACCES', 'ENOENT', 'EEXIST', 'EBUSY', 'EMFILE', 'ENFILE', 'EIO'],
          timeout: 3000,
        },
      );

      this.updateNextNumber(projectPath, nextNumber + 1);
      return { success: true, crCode, filePath: crPath };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Read next number from .mdt-next file */
  private getNextNumber(projectPath: string): number {
    const nextPath = join(projectPath, '.mdt-next');
    if (existsSync(nextPath)) {
      const content = readFileSync(nextPath, 'utf8');
      return parseInt(content || '1', 10);
    }
    return 1;
  }

  /** Write next number to .mdt-next file */
  private updateNextNumber(projectPath: string, nextNumber: number): void {
    const nextPath = join(projectPath, '.mdt-next');
    writeFileSync(nextPath, String(nextNumber), 'utf8');
  }

  /** Generate ticket code with padding */
  private generateTicketCode(projectCode: string, number: number): string {
    return `${projectCode}-${String(number).padStart(3, '0')}`;
  }

  /** Create URL-safe slug from title */
  private createSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  }
}
