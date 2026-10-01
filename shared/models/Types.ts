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
  CRLevelValue,
  CRPriorityValue,
  CRTypeValue,
} from '@mdt/domain-contracts'
import {
  CRLevel,
  CRPriority,
  CRType,
  CRStatus as DomainCRStatus,
} from '@mdt/domain-contracts'

// Re-export the enum objects (for accessing values like CRType.ARCHITECTURE)
export { CRLevel, CRPriority, DomainCRStatus as CRStatus, CRType }

// Re-export the value types (for type annotations like CRTypeValue)
export type { CRLevelValue, CRPriorityValue, CRTypeValue }

// Re-export CRStatus type
export type CRStatus = (typeof DomainCRStatus)[keyof typeof DomainCRStatus]

// Runtime validation array (re-exported from domain-contracts)
export const CR_STATUSES = [
  DomainCRStatus.PROPOSED,
  DomainCRStatus.APPROVED,
  DomainCRStatus.IN_PROGRESS,
  DomainCRStatus.IMPLEMENTED,
  DomainCRStatus.REJECTED,
  DomainCRStatus.ON_HOLD,
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

// Template Interfaces — canonical contracts live in @mdt/domain-contracts (MDT-101)
export type {
  Suggestion,
  Template,
  TemplateSection,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '@mdt/domain-contracts'

export {
  safeValidateTemplateConfig,
  SuggestionSchema,
  TemplateConfigSchema,
  TemplateSchema,
  TemplateSectionSchema,
  validateSuggestion,
  validateTemplate,
  validateTemplateConfig,
  validateValidationResult,
  ValidationResultSchema,
} from '@mdt/domain-contracts'
