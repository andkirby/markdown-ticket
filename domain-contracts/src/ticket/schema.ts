/**
 * MDT-101: Ticket/CR Schema
 *
 * Zod schemas for Ticket interfaces from shared/models/Ticket.ts
 * This is a placeholder implementation - the actual schemas will be implemented as part of MDT-101
 */

import { z } from 'zod';
import { CRStatusSchema, CRTypeSchema, CRPrioritySchema } from '../types/schema';

// Export placeholder schemas (will be implemented in MDT-101)
export const TicketSchema = z.object({
  code: z.string(),
  title: z.string(),
  status: CRStatusSchema,
  type: CRTypeSchema,
  priority: CRPrioritySchema,
  content: z.string(),
  filePath: z.string(),
  relatedTickets: z.array(z.string()),
  dependsOn: z.array(z.string()),
  blocks: z.array(z.string()),
  dateCreated: z.date().nullable(),
  lastModified: z.date().nullable(),
  // Optional fields
  phaseEpic: z.string().optional(),
  assignee: z.string().optional(),
  implementationDate: z.date().nullable().optional(),
  implementationNotes: z.string().optional()
});

export const TicketDataSchema = z.object({
  title: z.string(),
  type: CRTypeSchema,
  priority: CRPrioritySchema.optional(),
  phaseEpic: z.string().optional(),
  impactAreas: z.array(z.string()).optional(),
  relatedTickets: z.string().optional(),
  dependsOn: z.string().optional(),
  blocks: z.string().optional(),
  assignee: z.string().optional(),
  content: z.string().optional()
});

export const TicketUpdateAttrsSchema = z.object({
  priority: CRPrioritySchema.optional(),
  phaseEpic: z.string().optional(),
  relatedTickets: z.string().optional(),
  dependsOn: z.string().optional(),
  blocks: z.string().optional(),
  assignee: z.string().optional(),
  implementationDate: z.date().nullable().optional(),
  implementationNotes: z.string().optional()
});

export const TicketFiltersSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.union([z.string(), z.array(z.string())]).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }).optional()
});

// Type exports
export type Ticket = z.infer<typeof TicketSchema>;
export type TicketData = z.infer<typeof TicketDataSchema>;
export type TicketUpdateAttrs = z.infer<typeof TicketUpdateAttrsSchema>;
export type TicketFilters = z.infer<typeof TicketFiltersSchema>;