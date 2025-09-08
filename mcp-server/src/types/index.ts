export interface Project {
  id: string;
  project: {
    name: string;
    code: string;
    path: string;
    startNumber: number;
    counterFile: string;
    description?: string;
    repository?: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
  autoDiscovered?: boolean;
  configPath: string;
}

export interface ProjectInfo {
  key: string;
  name: string;
  description?: string;
  path: string;
  crCount: number;
  lastAccessed: string;
}

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

export type CRStatus = 
  | 'Proposed' 
  | 'Approved' 
  | 'In Progress' 
  | 'Implemented' 
  | 'Rejected'
  | 'On Hold';

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

export interface CRFilters {
  status?: CRStatus | CRStatus[];
  type?: CRType | CRType[];
  priority?: CRPriority | CRPriority[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

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

export interface Suggestion {
  type: 'improvement' | 'related' | 'validation';
  title: string;
  description: string;
  actionable?: boolean;
}

export interface ServerConfig {
  server: {
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  discovery: {
    scanPaths: string[];
    excludePaths: string[];
    maxDepth: number;
    cacheTimeout: number;
  };
  templates: {
    customPath?: string;
  };
}