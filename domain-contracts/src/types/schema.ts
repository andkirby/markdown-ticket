/**
 * MDT Phase 1: Core Entities - Source of truth for all CR enums
 * All other modules should import these enums from here.
 */

import { z } from 'zod'

// CR Status enumeration
export const CRStatus = {
  PROPOSED: 'Proposed',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  IMPLEMENTED: 'Implemented',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
  PARTIALLY_IMPLEMENTED: 'Partially Implemented',
} as const

export type CRStatusValue = (typeof CRStatus)[keyof typeof CRStatus]

export const CRStatuses = [
  CRStatus.PROPOSED,
  CRStatus.APPROVED,
  CRStatus.IN_PROGRESS,
  CRStatus.IMPLEMENTED,
  CRStatus.REJECTED,
  CRStatus.ON_HOLD,
  CRStatus.PARTIALLY_IMPLEMENTED,
] as const

export const CRStatusSchema = z.enum(CRStatuses)

// CR Type enumeration
export const CRType = {
  ARCHITECTURE: 'Architecture',
  FEATURE_ENHANCEMENT: 'Feature Enhancement',
  BUG_FIX: 'Bug Fix',
  TECHNICAL_DEBT: 'Technical Debt',
  DOCUMENTATION: 'Documentation',
  RESEARCH: 'Research',
} as const

export type CRTypeValue = (typeof CRType)[keyof typeof CRType]

export const CRTypes = [
  CRType.ARCHITECTURE,
  CRType.FEATURE_ENHANCEMENT,
  CRType.BUG_FIX,
  CRType.TECHNICAL_DEBT,
  CRType.DOCUMENTATION,
  CRType.RESEARCH,
] as const

export const CRTypeSchema = z.enum(CRTypes)

// CR Priority enumeration
export const CRPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const

export type CRPriorityValue = (typeof CRPriority)[keyof typeof CRPriority]

export const CRPriorities = [
  CRPriority.LOW,
  CRPriority.MEDIUM,
  CRPriority.HIGH,
  CRPriority.CRITICAL,
] as const

export const CRPrioritySchema = z.enum(CRPriorities)

/**
 * CR Level enumeration (MDT-205).
 *
 * `level` is an axis orthogonal to status/type/priority: it distinguishes a
 * regular ticket from an epic. A ticket whose `phaseEpic` points at another
 * ticket requires that target to be an epic in a usable state (Approved or
 * Implemented). Epics additionally follow a close guard before they may move
 * to Implemented.
 *
 * Defaults to `ticket` on read (no migration — existing files without `level`
 * are treated as regular tickets).
 */
export const CRLevel = {
  TICKET: 'ticket',
  EPIC: 'epic',
} as const

export type CRLevelValue = (typeof CRLevel)[keyof typeof CRLevel]

export const CRLevels = [CRLevel.TICKET, CRLevel.EPIC] as const

export const CRLevelSchema = z.enum(CRLevels)

/**
 * Inferred TypeScript types from Zod schemas
 * These can be used when you need types that are guaranteed to match the schemas
 */
export type CRStatusFromSchema = z.infer<typeof CRStatusSchema>
export type CRTypeFromSchema = z.infer<typeof CRTypeSchema>
export type CRPriorityFromSchema = z.infer<typeof CRPrioritySchema>
export type CRLevelFromSchema = z.infer<typeof CRLevelSchema>

/**
 * Export the schemas for use in other domain contracts
 */
export const CREnumSchemas = {
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  level: CRLevelSchema,
} as const
