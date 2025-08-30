import { z } from 'zod';

// Core Ticket Interface
export interface Ticket {
  // Required Core Attributes
  code: string;
  title: string;
  status: string;
  dateCreated: Date;
  type: string;
  priority: string;
  phaseEpic: string;

  // Optional Attributes
  source?: string;
  impact?: string;
  effort?: string;
  relatedTickets?: string[];
  supersedes?: string;
  dependsOn?: string[];
  blocks?: string[];
  relatedDocuments?: string[];
  implementationDate?: Date;
  implementationNotes?: string;

  // Derived/System Fields
  filePath: string;
  lastModified: Date;
  content: string; // Full markdown content
}

// Ticket Update Interface
export interface TicketUpdate {
  code: string;
  updates: Partial<Ticket>;
  updateImplementationDate?: boolean;
}

// File Event Types
export interface FileEvent {
  type: 'create' | 'update' | 'delete';
  filePath: string;
  cr?: Ticket;
}

// Suggestion Interface
export interface Suggestion {
  code: string;
  title: string;
  type: string;
  status: string;
  matchScore: number;
}

// Zod Schemas for Validation
export const TicketSchema = z.object({
  // Required Core Attributes
  code: z.string().regex(/^[A-Z]{2,}-[A-Z]\d{3}$/, 'Invalid ticket code format'),
  title: z.string().min(1, 'Title is required'),
  status: z.string().min(1, 'Status is required'),
  dateCreated: z.date(),
  type: z.string().min(1, 'Type is required'),
  priority: z.string().min(1, 'Priority is required'),
  phaseEpic: z.string().min(1, 'Phase epic is required'),

  // Optional Attributes
  source: z.string().optional(),
  impact: z.string().optional(),
  effort: z.string().optional(),
  relatedTickets: z.array(z.string()).optional(),
  supersedes: z.string().regex(/^[A-Z]{2,}-[A-Z]\d{3}$/, 'Invalid ticket code format').optional(),
  dependsOn: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  relatedDocuments: z.array(z.string()).optional(),
  implementationDate: z.date().optional(),
  implementationNotes: z.string().optional(),

  // Derived/System Fields
  filePath: z.string(),
  lastModified: z.date(),
  content: z.string(),
});

export type TicketFormData = z.infer<typeof TicketSchema>;

// Status Enum Values
export const STATUSES = [
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'On Hold',
  'Rejected',
  'Superseded',
  'Deprecated',
  'Duplicate',
  'Partially Implemented',
] as const;

export type Status = typeof STATUSES[number];

// Type Enum Values
export const TYPES = [
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Architecture',
  'Documentation',
] as const;

export type Type = typeof TYPES[number];

// Priority Enum Values
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export type Priority = typeof PRIORITIES[number];

// Phase Epic Enum Values
export const PHASE_EPICS = [
  'Phase A (Foundation)',
  'Phase B (Enhancement)',
  'Phase C',
  'Phase D',
] as const;

export type PhaseEpic = typeof PHASE_EPICS[number];

// Source Enum Values
export const SOURCES = [
  'User Request',
  'Technical Debt',
  'Bug Report',
  'Performance Issue',
] as const;

export type Source = typeof SOURCES[number];

// Impact Enum Values
export const IMPACTS = ['Major', 'Minor', 'Patch'] as const;

export type Impact = typeof IMPACTS[number];

// Effort Enum Values
export const EFFORTS = ['Small', 'Medium', 'Large'] as const;

export type Effort = typeof EFFORTS[number];