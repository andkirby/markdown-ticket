/**
 * MDT-101: Type Enums Schema
 *
 * Zod schemas for type enums from shared/models/Types.ts
 * This is a placeholder implementation - the actual schemas will be implemented as part of MDT-101
 */

import { z } from 'zod';

// Export placeholder schemas (will be implemented in MDT-101)
export const CRStatusSchema = z.enum([
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold',
  'Superseded',
  'Deprecated',
  'Duplicate',
  'Partially Implemented'
]);

export const CRTypeSchema = z.enum([
  'Architecture',
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Documentation'
]);

export const CRPrioritySchema = z.enum([
  'Low',
  'Medium',
  'High',
  'Critical'
]);

export const ProjectInfoSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  crCount: z.number().int().nonnegative(),
  lastAccessed: z.string().refine((val) => {
  // Try parsing as ISO datetime first
  if (val.includes('T') && val.includes('Z')) {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }
  // Try parsing as simple date format (YYYY-MM-DD)
  const date = new Date(val + 'T00:00:00Z');
  return !isNaN(date.getTime());
}, { message: 'Must be a valid date string (ISO or YYYY-MM-DD format)' })
});

// Type exports
export type CRStatus = z.infer<typeof CRStatusSchema>;
export type CRType = z.infer<typeof CRTypeSchema>;
export type CRPriority = z.infer<typeof CRPrioritySchema>;
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;