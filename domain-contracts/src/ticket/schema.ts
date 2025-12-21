/**
 * MDT-101 Phase 1: Ticket/CR Schema Validation
 * Core entity schemas with field-level validation only
 */

import { z } from 'zod';
import { CRStatusSchema, CRTypeSchema, CRPrioritySchema } from '../types/schema';

/**
 * Base CR schema with field validation
 * Core CR entity with required and optional fields
 */
export const CRSchema = z.object({
  /** CR code: PREFIX-123 format (e.g., MDT-101) */
  code: z.string()
    .regex(/^[A-Z][A-Z0-9]{2,4}-\d{3,4}$/, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  /** CR title: required, max 200 characters */
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .refine((title) => title.trim().length > 0, 'Title cannot be empty or whitespace-only')
    .transform((title) => title.trim()),
  /** CR status from predefined enum */
  status: CRStatusSchema,
  /** CR type from predefined enum */
  type: CRTypeSchema,
  /** CR priority from predefined enum */
  priority: CRPrioritySchema,
  /** Optional phase or epic identifier */
  phaseEpic: z.string().optional(),
  /** Optional areas impacted by this CR */
  impactAreas: z.array(z.string()).optional(),
  /** Optional comma-separated list of related ticket codes */
  relatedTickets: z.string().optional(),
  /** Optional comma-separated list of dependencies */
  dependsOn: z.string().optional(),
  /** Optional comma-separated list of tickets blocked by this CR */
  blocks: z.string().optional(),
  /** Optional assignee email address */
  assignee: z.string().email('Invalid email format').optional(),
  /** Full CR content in markdown format */
  content: z.string().optional(),
  /** Optional implementation date in YYYY-MM-DD format */
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  /** Optional implementation notes */
  implementationNotes: z.string().optional(),
});

/**
 * Ticket schema (extends CR with additional fields)
 * Currently identical to CR schema but allows for future extension
 */
export const TicketSchema = CRSchema;

/**
 * Input schema for creating tickets
 * Only required fields, no default values applied
 */
export const CreateTicketInputSchema = CRSchema;

/**
 * Input schema for updating tickets
 * Partial update with code required for identification
 */
export const UpdateTicketInputSchema = z.object({
  /** CR code: required for identification */
  code: z.string()
    .regex(/^[A-Z][A-Z0-9]{2,4}-\d{3,4}$/, 'CR code must be in format PREFIX-123 (e.g., MDT-101)'),
  /** Optional new title */
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .refine((title) => title.trim().length > 0, 'Title cannot be empty or whitespace-only')
    .transform((title) => title.trim())
    .optional(),
  /** Optional new status */
  status: CRStatusSchema.optional(),
  /** Optional new type */
  type: CRTypeSchema.optional(),
  /** Optional new priority */
  priority: CRPrioritySchema.optional(),
  /** Optional new phase or epic identifier */
  phaseEpic: z.string().optional(),
  /** Optional new areas impacted by this CR */
  impactAreas: z.array(z.string()).optional(),
  /** Optional new comma-separated list of related ticket codes */
  relatedTickets: z.string().optional(),
  /** Optional new comma-separated list of dependencies */
  dependsOn: z.string().optional(),
  /** Optional new comma-separated list of tickets blocked by this CR */
  blocks: z.string().optional(),
  /** Optional new assignee email address */
  assignee: z.string().email('Invalid email format').optional(),
  /** Optional new CR content in markdown format */
  content: z.string().optional(),
  /** Optional new implementation date in YYYY-MM-DD format */
  implementationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  /** Optional new implementation notes */
  implementationNotes: z.string().optional(),
}).refine(
  (data) => {
    // At least one field besides code must be provided for update
    const fieldsToUpdate = Object.keys(data).filter(key => key !== 'code');
    return fieldsToUpdate.length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

// TypeScript types inferred from schemas
export type CR = z.infer<typeof CRSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>;


/**
 * Export all schemas for use in other modules
 */
export const TicketSchemas = {
  ticket: TicketSchema,
  cr: CRSchema,
  createTicketInput: CreateTicketInputSchema,
  updateTicketInput: UpdateTicketInputSchema,
} as const;

/**
 * Export individual enum schemas for convenience
 */
export { CRStatusSchema, CRTypeSchema, CRPrioritySchema } from '../types/schema';