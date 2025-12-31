/**
 * Test Fixtures for MCP Server Tests
 *
 * This file provides local type definitions and test data to avoid requiring
 * the shared/dist directory to be built during testing. These types match
 * the interfaces from @mdt/shared but are defined locally for test isolation.
 */

/**
 * Local Project interface matching @mdt/shared/models/Project
 */
export interface Project {
  id: string;
  project: {
    id?: string;
    name: string;
    code?: string;
    path: string;
    configFile: string;
    counterFile?: string;
    startNumber?: number;
    active: boolean;
    description: string;
    repository?: string;
    ticketsPath?: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
    globalOnly?: boolean;
  };
  tickets?: {
    codePattern?: string;
  };
  document?: {
    paths?: string[];
    excludeFolders?: string[];
    maxDepth?: number;
  };
  autoDiscovered?: boolean;
  configPath?: string;
  registryFile?: string;
}

/**
 * Local Ticket interface matching @mdt/shared/models/Ticket
 */
export interface Ticket {
  code: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  dateCreated: Date | null;
  lastModified: Date | null;
  content: string;
  filePath: string;
  phaseEpic?: string;
  assignee?: string;
  implementationDate?: Date | null;
  implementationNotes?: string;
  relatedTickets: string[];
  dependsOn: string[];
  blocks: string[];
}

/**
 * Local TicketData interface matching @mdt/shared/models/Ticket
 */
export interface TicketData {
  title: string;
  type: string;
  priority?: string;
  phaseEpic?: string;
  impactAreas?: string[];
  relatedTickets?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  content?: string;
}

/**
 * Local TicketFilters interface matching @mdt/shared/models/Ticket
 */
export interface TicketFilters {
  status?: string | string[];
  type?: string | string[];
  priority?: string | string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Local SectionMatch interface matching @mdt/shared/services/MarkdownSectionService
 */
export interface SectionMatch {
  headerText: string;
  headerLevel: number;
  startLine: number;
  endLine: number;
  content: string;
  hierarchicalPath: string;
}

/**
 * Create a mock project for testing
 */
export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'test-project-id',
    project: {
      code: 'MDT',
      name: 'Test Project',
      path: '/test/path',
      configFile: '/test/path/.mdt-config.toml',
      ticketsPath: 'docs/CRs',
      active: true,
      description: 'Test project for MCP server'
    },
    metadata: {
      dateRegistered: '2024-01-01T00:00:00.000Z',
      lastAccessed: '2024-01-02T00:00:00.000Z',
      version: '1.0.0'
    },
    ...overrides
  };
}

/**
 * Create a mock ticket for testing
 */
export function createMockTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    code: 'MDT-001',
    title: 'Test CR Title',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    phaseEpic: 'Phase 1',
    assignee: 'developer',
    dateCreated: new Date('2024-01-01'),
    lastModified: new Date('2024-01-02'),
    content: '# Test CR\n\n## Description\nTest content here.',
    filePath: '/test/path/docs/CRs/MDT-001-test-cr-title.md',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...overrides
  };
}

/**
 * Mock file content with YAML frontmatter
 */
export const mockFileContent = `---
code: MDT-001
title: Test CR Title
status: Proposed
type: Feature Enhancement
priority: Medium
phaseEpic: Phase 1
assignee: developer
---

# Test CR Content`;

/**
 * Mock file content with full CR structure
 */
export const mockFullFileContent = `---
code: MDT-001
title: Test CR Title
status: Proposed
type: Feature Enhancement
priority: Medium
phaseEpic: Phase 1
lastModified: 2024-01-01T00:00:00.000Z
---

# Test CR

## 1. Description

This is the description section.

## 2. Rationale

This is the rationale section.

### Key Points

- Point 1
- Point 2

## 3. Solution Analysis

Analysis content here.

## 4. Implementation Specification

Implementation details.

## 5. Acceptance Criteria

Criteria here.
`;
