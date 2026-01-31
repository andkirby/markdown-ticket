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
import type {
  CRPriorityValue,
  CRTypeValue,
} from '@mdt/domain-contracts'
import {
  CRPriority,
  CRType,
  CRStatus as DomainCRStatus,
} from '@mdt/domain-contracts'

// Re-export the enum objects (for accessing values like CRType.ARCHITECTURE)
export { CRPriority, DomainCRStatus as CRStatus, CRType }

// Re-export the value types (for type annotations like CRTypeValue)
export type { CRPriorityValue, CRTypeValue }

// Re-export CRStatus type
export type CRStatus = typeof DomainCRStatus[keyof typeof DomainCRStatus]

// Runtime validation array (re-exported from domain-contracts)
export const CR_STATUSES = [
  DomainCRStatus.PROPOSED,
  DomainCRStatus.APPROVED,
  DomainCRStatus.IN_PROGRESS,
  DomainCRStatus.IMPLEMENTED,
  DomainCRStatus.REJECTED,
  DomainCRStatus.ON_HOLD,
  DomainCRStatus.SUPERSEDED,
  DomainCRStatus.DEPRECATED,
  DomainCRStatus.DUPLICATE,
  DomainCRStatus.PARTIALLY_IMPLEMENTED,
] as const satisfies readonly CRStatus[]

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
