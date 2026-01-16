/**
 * Centralized Tool Configuration Registry
 *
 * This file contains all 10 MCP tool definitions in a single location
 * to eliminate duplication and provide a single source of truth for tool schemas.
 *
 * Tools are organized by category:
 * - Project Tools: list_projects, get_project_info
 * - CR/Section Tools: All 8 CR and section management tools
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js'

// =========================
// Project Tool Definitions
// =========================

/**
 * Tools for project management operations
 */
export const PROJECT_TOOLS: Tool[] = [
  {
    name: 'list_projects',
    description: 'List all discovered projects',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_project_info',
    description: 'Get detailed project information',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Project key (e.g., MDT, API, WEB)',
        },
      },
      required: ['key'],
    },
  },
]

// =====================================
// CR and Section Tool Definitions
// =====================================

/**
 * Shared enums for tool schemas
 */
const CR_STATUS_ENUM = ['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected']
const CR_STATUS_EXTENDED_ENUM = [...CR_STATUS_ENUM, 'On Hold']
const CR_TYPE_ENUM = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation']
const CR_PRIORITY_ENUM = ['Low', 'Medium', 'High', 'Critical']

/**
 * Tools for CR and section management operations
 */
export const CR_SECTION_TOOLS: Tool[] = [
  // CR Operations
  {
    name: 'list_crs',
    description: 'List CRs with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        filters: {
          type: 'object',
          properties: {
            status: {
              oneOf: [
                { type: 'string', enum: CR_STATUS_ENUM },
                { type: 'array', items: { type: 'string', enum: CR_STATUS_ENUM } },
              ],
              description: 'Filter by status',
            },
            type: {
              oneOf: [
                { type: 'string', enum: CR_TYPE_ENUM },
                { type: 'array', items: { type: 'string', enum: CR_TYPE_ENUM } },
              ],
              description: 'Filter by type',
            },
            priority: {
              oneOf: [
                { type: 'string', enum: CR_PRIORITY_ENUM },
                { type: 'array', items: { type: 'string', enum: CR_PRIORITY_ENUM } },
              ],
              description: 'Filter by priority',
            },
          },
        },
      },
      required: ['project'],
    },
  },
  {
    name: 'create_cr',
    description: 'Create a new CR. Available types: Architecture (system design), Feature Enhancement (new functionality), Bug Fix (defect resolution), Technical Debt (code quality), Documentation (project docs)',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        type: {
          type: 'string',
          enum: CR_TYPE_ENUM,
          description: 'CR type',
        },
        data: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'CR title/summary',
            },
            priority: {
              type: 'string',
              enum: CR_PRIORITY_ENUM,
              description: 'CR priority (default: Medium)',
            },
            phaseEpic: {
              type: 'string',
              description: 'Phase or epic',
            },
            impactAreas: {
              type: 'array',
              items: { type: 'string' },
              description: 'System areas impacted',
            },
            relatedTickets: {
              type: 'string',
              description: 'Related CR codes (comma-separated)',
            },
            dependsOn: {
              type: 'string',
              description: 'CR dependencies (comma-separated)',
            },
            blocks: {
              type: 'string',
              description: 'CRs blocked by this (comma-separated)',
            },
            assignee: {
              type: 'string',
              description: 'Implementation assignee',
            },
            content: {
              type: 'string',
              description: `FULL markdown document with required sections:

  ## 1. Description
  - Problem statement with background context
  - Current state vs. desired state
  - Business or technical justification

  ## 2. Rationale
  - Why this change is necessary
  - What it accomplishes
  - Alignment with project goals

  ## 3. Solution Analysis
  - Evaluated alternatives with trade-offs
  - Selected approach with justification
  - Rejected options and why

  ## 4. Implementation Specification
  - Technical details and architecture changes
  - Step-by-step implementation plan
  - Testing requirements and success criteria

  ## 5. Acceptance Criteria
  - Measurable conditions for completion
  - Definition of "done"

  Template auto-generated if omitted. When providing content, include ALL sections above.`,
            },
          },
          required: ['title'],
        },
      },
      required: ['project', 'type', 'data'],
    },
  },
  {
    name: 'get_cr',
    description: 'Get CR (consolidated - replaces get_cr_full_content + get_cr_attributes)',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        key: {
          type: 'string',
          description: 'CR key (e.g., MDT-004, API-123)',
        },
        mode: {
          type: 'string',
          enum: ['full', 'attributes', 'metadata'],
          description: 'Return mode: full=CR+markdown, attributes=YAML only, metadata=key info only',
          default: 'full',
        },
      },
      required: ['project', 'key'],
    },
  },
  {
    name: 'update_cr_status',
    description: 'Update CR status',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        key: {
          type: 'string',
          description: 'CR key',
        },
        status: {
          type: 'string',
          enum: CR_STATUS_EXTENDED_ENUM,
          description: 'New CR status',
        },
      },
      required: ['project', 'key', 'status'],
    },
  },
  {
    name: 'update_cr_attrs',
    description: 'Update CR attributes. Only the following attributes can be updated: priority, phaseEpic, assignee, relatedTickets, dependsOn, blocks, implementationDate, implementationNotes. To update CR title, use manage_cr_sections (edit the H1 header - MDT-064). To update CR status, use update_cr_status. To update CR content/sections, use manage_cr_sections.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        key: {
          type: 'string',
          description: 'CR key',
        },
        attributes: {
          type: 'object',
          description: 'Attributes to update. Only these fields are allowed: priority, phaseEpic, assignee, relatedTickets, dependsOn, blocks, implementationDate, implementationNotes. Do NOT update title directly - update the H1 header in the CR content using manage_cr_sections instead (MDT-064: H1 as Single Source of Truth).',
          properties: {
            priority: { type: 'string', enum: CR_PRIORITY_ENUM, description: 'CR priority' },
            phaseEpic: { type: 'string', description: 'Phase or epic' },
            relatedTickets: { type: 'string', description: 'Related CR codes (comma-separated)' },
            dependsOn: { type: 'string', description: 'CR dependencies (comma-separated)' },
            blocks: { type: 'string', description: 'CRs blocked by this (comma-separated)' },
            assignee: { type: 'string', description: 'Implementation assignee' },
            implementationDate: { type: 'string', description: 'Date when implementation was completed (ISO 8601 format, e.g., "2025-09-20")' },
            implementationNotes: { type: 'string', description: 'Notes about implementation completion' },
          },
        },
      },
      required: ['project', 'key', 'attributes'],
    },
  },
  {
    name: 'delete_cr',
    description: 'Delete CR',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key',
        },
        key: {
          type: 'string',
          description: 'CR key',
        },
      },
      required: ['project', 'key'],
    },
  },
  {
    name: 'manage_cr_sections',
    description: `Manage CR sections with targeted operations. Operations: list (all sections), get (read one), replace (all content), append (add to end), prepend (add to beginning). Section matching supports: "Description", "## 1. Description", or hierarchical paths. Content with header renames section.`,
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key (e.g., "MDT", "SEB")',
        },
        key: {
          type: 'string',
          description: 'CR key (e.g., "MDT-001", "SEB-010")',
        },
        operation: {
          type: 'string',
          enum: ['list', 'get', 'replace', 'append', 'prepend'],
          description: 'Operation: list=all sections with structure, get=read specific section, replace=entire content, append=add to end, prepend=add to beginning',
        },
        section: {
          type: 'string',
          description: 'Section identifier (supports flexible formats: "1. Description", "Description", exact "## 1. Description", or hierarchical "## Parent / ### Child"). Required for get/replace/append/prepend operations.',
        },
        content: {
          type: 'string',
          description: 'Content to apply (required for replace/append/prepend operations). To rename/restructure: start with new header at same level. To preserve header: provide only body content.',
        },
      },
      required: ['project', 'key', 'operation'],
    },
  },
  {
    name: 'suggest_cr_improvements',
    description: 'Get CR improvement suggestions (analyzes structure/completeness)',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key (e.g., "MDT", "API")',
        },
        key: {
          type: 'string',
          description: 'CR key to analyze (e.g., "MDT-001")',
        },
      },
      required: ['project', 'key'],
    },
  },
]

// ==========================
// Combined Tool Registry
// ==========================

/**
 * All MCP tools in a single array
 * This is the main export used by the index.ts file
 */
export const ALL_TOOLS: Tool[] = [
  ...PROJECT_TOOLS,
  ...CR_SECTION_TOOLS,
]

// ==========================
// Tool Categories
// ==========================

/**
 * Group tools by category for easier access
 */
export const TOOL_CATEGORIES = {
  PROJECT: PROJECT_TOOLS.map(t => t.name),
  CR_SECTION: CR_SECTION_TOOLS.map(t => t.name),
} as const

// Tool name constants for type safety
export const TOOL_NAMES = {
  LIST_PROJECTS: 'list_projects',
  GET_PROJECT_INFO: 'get_project_info',
  LIST_CRS: 'list_crs',
  CREATE_CR: 'create_cr',
  GET_CR: 'get_cr',
  UPDATE_CR_STATUS: 'update_cr_status',
  UPDATE_CR_ATTRS: 'update_cr_attrs',
  DELETE_CR: 'delete_cr',
  MANAGE_CR_SECTIONS: 'manage_cr_sections',
  SUGGEST_CR_IMPROVEMENTS: 'suggest_cr_improvements',
} as const
