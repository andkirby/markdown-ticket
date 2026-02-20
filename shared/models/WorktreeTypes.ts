/**
 * MDT-095: Git Worktree Support - Core Type Definitions
 *
 * Defines interfaces and schemas for worktree detection, mapping, and configuration.
 * Uses Zod for runtime validation and type inference.
 *
 * @module shared/models/WorktreeTypes
 */

import { z } from 'zod'

/**
 * Ticket code pattern: PROJECT_CODE-NUMBER (e.g., MDT-095, API-123)
 * Matches branch naming conventions for feature/bugfix branches.
 */
const TICKET_CODE_PATTERN = /^[A-Z]{2,}-\d{3,}$/

/**
 * WorktreeMapping represents a single worktree entry mapping a ticket code to its filesystem path.
 *
 * @example
 * ```ts
 * const mapping: WorktreeMapping = {
 *   ticketCode: 'MDT-095',
 *   path: '/path/to/worktrees/MDT-095',
 *   branch: 'refs/heads/feature/MDT-095'
 * }
 * ```
 */
export interface WorktreeMapping {
  /** Ticket code in format PROJECT_CODE-NUMBER (e.g., MDT-095) */
  ticketCode: string
  /** Absolute path to the worktree directory */
  path: string
  /** Optional branch reference (e.g., refs/heads/feature/MDT-095) */
  branch?: string
}

/**
 * WorktreeInfo represents runtime information about a detected worktree.
 * Includes metadata about the worktree's state and relationship to the main project.
 *
 * @example
 * ```ts
 * const info: WorktreeInfo = {
 *   ticketCode: 'MDT-095',
 *   path: '/path/to/worktrees/MDT-095',
 *   branch: 'refs/heads/feature/MDT-095',
 *   exists: true,
 *   hasTicketFile: true
 * }
 * ```
 */
export interface WorktreeInfo {
  /** Ticket code in format PROJECT_CODE-NUMBER (e.g., MDT-095) */
  ticketCode: string
  /** Absolute path to the worktree directory */
  path: string
  /** Branch reference (e.g., refs/heads/feature/MDT-095) */
  branch?: string
  /** Whether the worktree directory exists on filesystem */
  exists: boolean
  /** Whether the ticket markdown file exists in this worktree */
  hasTicketFile: boolean
}

/**
 * WorktreeConfig controls worktree detection behavior.
 *
 * @example
 * ```ts
 * const config: WorktreeConfig = {
 *   enabled: true
 * }
 * ```
 */
export interface WorktreeConfig {
  /** Enable or disable worktree detection (default: true) */
  enabled: boolean
}

// Zod Schemas for runtime validation

/**
 * Zod schema for WorktreeMapping validation.
 * Enforces ticket code format (PROJECT_CODE-NUMBER).
 */
export const WorktreeMappingSchema = z.object({
  ticketCode: z.string().regex(TICKET_CODE_PATTERN, 'Invalid ticket code format. Expected PROJECT_CODE-NUMBER (e.g., MDT-095)'),
  path: z.string(),
  branch: z.string().optional(),
}).strict()

/**
 * Zod schema for WorktreeInfo validation.
 */
export const WorktreeInfoSchema = z.object({
  ticketCode: z.string().regex(TICKET_CODE_PATTERN, 'Invalid ticket code format. Expected PROJECT_CODE-NUMBER (e.g., MDT-095)'),
  path: z.string(),
  branch: z.string().optional(),
  exists: z.boolean(),
  hasTicketFile: z.boolean(),
}).strict()

/**
 * Zod schema for WorktreeConfig validation.
 * Defaults enabled to true when not specified.
 */
export const WorktreeConfigSchema = z.object({
  enabled: z.boolean().default(true),
}).strict()

/**
 * Type inference from Zod schemas for type-safe runtime validation.
 */
export type WorktreeMappingInput = z.input<typeof WorktreeMappingSchema>
export type WorktreeMappingOutput = z.output<typeof WorktreeMappingSchema>
export type WorktreeInfoInput = z.input<typeof WorktreeInfoSchema>
export type WorktreeInfoOutput = z.output<typeof WorktreeInfoSchema>
export type WorktreeConfigInput = z.input<typeof WorktreeConfigSchema>
export type WorktreeConfigOutput = z.output<typeof WorktreeConfigSchema>

/**
 * Validates WorktreeConfig input.
 *
 * @param input - Unknown input to validate
 * @returns Zod validation result with success flag and typed data or error
 *
 * @example
 * ```ts
 * const result = validateWorktreeConfig({ enabled: true })
 * if (result.success) {
 *   console.log(result.data.enabled) // true
 * }
 * ```
 */
export function validateWorktreeConfig(input: unknown) {
  return WorktreeConfigSchema.safeParse(input)
}

/**
 * Validates WorktreeMapping input.
 *
 * @param input - Unknown input to validate
 * @returns Zod validation result with success flag and typed data or error
 */
export function validateWorktreeMapping(input: unknown) {
  return WorktreeMappingSchema.safeParse(input)
}

/**
 * Validates WorktreeInfo input.
 *
 * @param input - Unknown input to validate
 * @returns Zod validation result with success flag and typed data or error
 */
export function validateWorktreeInfo(input: unknown) {
  return WorktreeInfoSchema.safeParse(input)
}
