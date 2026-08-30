import type { CRStatus } from '@mdt/shared/models/Types'

/**
 * Canonical CR status labels. Inline `VALID_STATUSES.includes(status as CRStatus)`
 * at call sites. Kept as data (not a wrapper function) per ts-no-tiny-functions;
 * lives outside component files so they stay Fast-Refresh-clean.
 */
export const VALID_STATUSES: CRStatus[] = [
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Partially Implemented',
  'On Hold',
  'Rejected',
]
