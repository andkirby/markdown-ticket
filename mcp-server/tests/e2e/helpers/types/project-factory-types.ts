/**
 * Project Factory Types
 *
 * Shared type definitions for ProjectFactory refactoring.
 * Extracted from project-factory.ts and extended with forward-looking types.
 */

// ===== Existing Types from ProjectFactory =====

export interface ProjectConfig {
  repository?: string;
  name?: string;
  code?: string;
  description?: string;
  ticketsPath?: string;
  documentPaths?: string[];
  excludeFolders?: string[];
}

export interface ProjectData {
  key: string;
  path: string;
  config: ProjectConfig;
}

export interface TestCRData {
  title: string;
  type: 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation';
  status?: 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  phaseEpic?: string;
  dependsOn?: string;
  blocks?: string;
  assignee?: string;
  content: string;
}

export interface TestScenario {
  projectCode: string;
  projectName: string;
  projectDir: string;
  crs: MCPResponse[];
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  key?: string;
}

export class ProjectFactoryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ProjectFactoryError';
  }
}

// ===== Forward-looking Types for Refactoring =====

export interface TicketCreator {
  create(projectCode: string, data: TicketData): Promise<TicketResult>;
  validate(data: TicketData): ValidationResult;
  getType(): string;
}

export interface TicketData {
  // Required fields
  title: string;
  type: string;
  content: string;

  // Optional common fields
  status?: string;
  priority?: string;
  assignee?: string;

  // Relationship fields
  dependsOn?: string[];
  blocks?: string[];
  phaseEpic?: string;

  // Extended attributes
  attributes?: Record<string, any>;

  // Creation metadata
  metadata?: {
    source?: string;
    template?: string;
    tags?: string[];
  };
}

export interface TicketResult {
  success: boolean;
  ticketId?: string;
  ticket?: TicketData;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    creator: string;
    duration: number;
    attempts: number;
    warnings?: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface TicketCreationConfig {
  defaultCreator: 'mcp' | 'direct' | 'template';
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
  validation: {
    strict: boolean;
    requiredSections: string[];
    maxTitleLength: number;
  };
  mcpConfig?: {
    timeout: number;
    batchSize: number;
  };
  directConfig?: {
    filePath: string;
    encoding: string;
  };
  templateConfig?: {
    templateDir: string;
    defaultTemplate: string;
  };
}

// ===== Type Aliases =====

export type ProjectCodeRegex = RegExp;
export type ScenarioType = 'standard-project' | 'complex-project';
export type ProjectCreationType = 'empty';
export type CRStatus = 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected';
export type CRType = 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation';
export type CRPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface DefaultProjectConfig {
  crPath: string;
  documentPaths: string[];
  excludeFolders: string[];
}