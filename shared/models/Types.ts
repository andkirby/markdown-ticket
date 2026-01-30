/**
 * Comprehensive Type Definitions for Markdown Ticket System
 * Unified types for Frontend, Backend, and MCP systems
 */

// Core Status Types
export type CRStatus
  = | 'Proposed'
    | 'Approved'
    | 'In Progress'
    | 'Implemented'
    | 'Rejected'
    | 'On Hold'
    | 'Superseded'
    | 'Deprecated'
    | 'Duplicate'
    | 'Partially Implemented'

export type CRType
  = | 'Architecture'
    | 'Feature Enhancement'
    | 'Bug Fix'
    | 'Technical Debt'
    | 'Documentation'
    | 'Research'

export type CRPriority
  = | 'Low'
    | 'Medium'
    | 'High'
    | 'Critical'

// Runtime validation arrays (must match type definitions above)
export const CR_STATUSES: readonly CRStatus[] = [
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold',
  'Superseded',
  'Deprecated',
  'Duplicate',
  'Partially Implemented',
] as const

export const CR_TYPES: readonly CRType[] = [
  'Architecture',
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Documentation',
  'Research',
] as const

export const CR_PRIORITIES: readonly CRPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
] as const

// Project Information Interface
export interface ProjectInfo {
  key: string
  name: string
  description?: string
  path: string
  crCount: number
  lastAccessed: string
}

// Template Interfaces
export interface Template {
  type: string
  requiredFields: string[]
  template: string
  sections: TemplateSection[]
}

export interface TemplateSection {
  name: string
  required: boolean
  placeholder?: string
}

// Validation Interfaces
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationWarning {
  field: string
  message: string
}

// Suggestion Interface
export interface Suggestion {
  type: 'improvement' | 'related' | 'validation'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  actionable: boolean
}
