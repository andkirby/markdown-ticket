/**
 * Comprehensive Type Definitions for Markdown Ticket System
 * Unified types for Frontend, Backend, and MCP systems
 */

// Core Status Types
export type CRStatus = 
  | 'Proposed' 
  | 'Approved' 
  | 'In Progress' 
  | 'Implemented' 
  | 'Rejected'
  | 'On Hold'
  | 'Superseded'
  | 'Deprecated'
  | 'Duplicate'
  | 'Partially Implemented';

export type CRType = 
  | 'Architecture' 
  | 'Feature Enhancement' 
  | 'Bug Fix' 
  | 'Technical Debt' 
  | 'Documentation';

export type CRPriority = 
  | 'Low' 
  | 'Medium' 
  | 'High' 
  | 'Critical';

// Enhanced CR Interface (from MCP server)
export interface CR {
  key: string;
  title: string;
  status: CRStatus;
  type: CRType;
  priority: CRPriority;
  dateCreated: Date;
  lastModified: Date;
  content: string;
  filePath: string;
  phaseEpic?: string;
  description?: string;
  rationale?: string;
  source?: string;
  impact?: string;
  effort?: string;
  implementationDate?: Date;
  implementationNotes?: string;
  relatedTickets?: string[];
  supersedes?: string;
  dependsOn?: string[];
  blocks?: string[];
  relatedDocuments?: string[];
  // Additional optional attributes
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  reviewers?: string[];
  dependencies?: string[];
  riskLevel?: 'Low' | 'Medium' | 'High';
  tags?: string[];
}

// Filtering Interface
export interface CRFilters {
  status?: CRStatus | CRStatus[];
  type?: CRType | CRType[];
  priority?: CRPriority | CRPriority[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

// Creation Data Interface
export interface CRData {
  // Mandatory fields
  title: string;
  type: CRType;
  priority?: CRPriority;
  
  // Optional fields
  phaseEpic?: string;
  description?: string;
  rationale?: string;
  impactAreas?: string[];
  relatedTickets?: string;
  dependsOn?: string;
  blocks?: string;
  impact?: 'Major' | 'Minor' | 'Breaking' | 'Patch';
  effort?: 'Small' | 'Medium' | 'Large';
  assignee?: string;
  reviewers?: string;
  dependencies?: string;
  riskLevel?: 'Low' | 'Medium' | 'High';
  tags?: string;
  content?: string;
}

// Project Information Interface
export interface ProjectInfo {
  key: string;
  name: string;
  description?: string;
  path: string;
  crCount: number;
  lastAccessed: string;
}

// Template Interfaces
export interface Template {
  type: CRType;
  requiredFields: string[];
  template: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  name: string;
  required: boolean;
  placeholder?: string;
}

// Validation Interfaces
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Suggestion Interface
export interface Suggestion {
  type: 'improvement' | 'related' | 'validation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}
