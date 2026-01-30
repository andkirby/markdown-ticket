/**
 * Comprehensive Type Definitions for Markdown Ticket System
 * Unified types for Frontend, Backend, and MCP systems
 *
 * MDT-101: Type enums now imported from @mdt/domain-contracts as single source of truth.
 *
 * For CR types and priorities, import from @mdt/domain-contracts:
 * - Values: import { CRType, CRPriority } from '@mdt/domain-contracts'
 * - Types: import type { CRTypeValue, CRPriorityValue } from '@mdt/domain-contracts'
 */

// Import and re-export enum objects and value types from domain-contracts
import {
  CRPriority,
  CRPriorityValue,
  CRType,
  CRTypeValue,
} from '@mdt/domain-contracts'

// Re-export the enum objects (for accessing values like CRType.ARCHITECTURE)
export { CRPriority, CRType }

// Re-export the value types (for type annotations like CRTypeValue)
export type { CRPriorityValue, CRTypeValue }

// Core Status Types - NOTE: Extended values not yet in domain-contracts, keeping local definition
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

// Runtime validation array (must match type definition above)
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
