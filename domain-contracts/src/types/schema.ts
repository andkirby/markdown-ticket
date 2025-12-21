/**
 * MDT Phase 1: Core Entities - Source of truth for all CR enums
 * All other modules should import these enums from here.
 */

import { z } from 'zod';

// CR Status enumeration
export const CRStatus = {
  PROPOSED: 'Proposed',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  IMPLEMENTED: 'Implemented',
  REJECTED: 'Rejected',
} as const;

export type CRStatus = typeof CRStatus[keyof typeof CRStatus];

export const AllCRStatuses = [
  CRStatus.PROPOSED,
  CRStatus.APPROVED,
  CRStatus.IN_PROGRESS,
  CRStatus.IMPLEMENTED,
  CRStatus.REJECTED,
] as const;

export const CRStatusSchema = z.enum(AllCRStatuses);

// CR Type enumeration
export const CRType = {
  ARCHITECTURE: 'Architecture',
  FEATURE_ENHANCEMENT: 'Feature Enhancement',
  BUG_FIX: 'Bug Fix',
  TECHNICAL_DEBT: 'Technical Debt',
  DOCUMENTATION: 'Documentation',
} as const;

export type CRType = typeof CRType[keyof typeof CRType];

export const AllCRTypes = [
  CRType.ARCHITECTURE,
  CRType.FEATURE_ENHANCEMENT,
  CRType.BUG_FIX,
  CRType.TECHNICAL_DEBT,
  CRType.DOCUMENTATION,
] as const;

export const CRTypeSchema = z.enum(AllCRTypes);

// CR Priority enumeration
export const CRPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

export type CRPriority = typeof CRPriority[keyof typeof CRPriority];

export const AllCRPriorities = [
  CRPriority.LOW,
  CRPriority.MEDIUM,
  CRPriority.HIGH,
  CRPriority.CRITICAL,
] as const;

export const CRPrioritySchema = z.enum(AllCRPriorities);

/**
 * Inferred TypeScript types from Zod schemas
 * These can be used when you need types that are guaranteed to match the schemas
 */
export type CRStatusFromSchema = z.infer<typeof CRStatusSchema>;
export type CRTypeFromSchema = z.infer<typeof CRTypeSchema>;
export type CRPriorityFromSchema = z.infer<typeof CRPrioritySchema>;

/**
 * Export the schemas for use in other domain contracts
 */
export const CREnumSchemas = {
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
} as const;