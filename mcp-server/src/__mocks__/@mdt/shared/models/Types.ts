/**
 * Mock types from @mdt/shared/models/Types
 * NOTE: Keep in sync with shared/models/Types.ts
 */

export type CRStatus = 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected' | 'On Hold' | 'Superseded' | 'Deprecated' | 'Duplicate' | 'Partially Implemented'
export type CRType = 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation' | 'Research'
export type CRPriority = 'Low' | 'Medium' | 'High' | 'Critical'

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
