/**
 * MDT-101 Phase 1: Ticket Validation Functions
 * Validation wrapper functions using schemas from ./schema.ts
 */

import {
  TicketSchema,
  CRSchema,
  CreateTicketInputSchema,
  UpdateTicketInputSchema
} from './schema.js';
import { z } from 'zod';

/**
 * Validate ticket data using TicketSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateTicket(data: unknown) {
  return TicketSchema.parse(data);
}

/**
 * Safely validate ticket data using TicketSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateTicket(data: unknown): z.SafeParseReturnType<typeof TicketSchema._type, typeof TicketSchema._type> {
  return TicketSchema.safeParse(data);
}

/**
 * Validate CR data using CRSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateCR(data: unknown) {
  return CRSchema.parse(data);
}

/**
 * Safely validate CR data using CRSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateCR(data: unknown): z.SafeParseReturnType<typeof CRSchema._type, typeof CRSchema._type> {
  return CRSchema.safeParse(data);
}

/**
 * Validate create ticket input using CreateTicketInputSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateCreateTicketInput(data: unknown) {
  return CreateTicketInputSchema.parse(data);
}

/**
 * Validate update ticket input using UpdateTicketInputSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateUpdateTicketInput(data: unknown) {
  return UpdateTicketInputSchema.parse(data);
}