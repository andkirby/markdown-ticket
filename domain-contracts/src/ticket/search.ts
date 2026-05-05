/**
 * Cross-project search contracts — MDT-152
 *
 * Schemas and enums for search requests, responses, and error codes.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// SearchMode enum
// ---------------------------------------------------------------------------

export const SearchMode = {
  TICKET_KEY: 'ticket_key',
  PROJECT_SCOPE: 'project_scope',
} as const

export type SearchMode = (typeof SearchMode)[keyof typeof SearchMode]

// ---------------------------------------------------------------------------
// SearchRequestSchema
// ---------------------------------------------------------------------------

export const SearchRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('ticket_key'),
    query: z.string().min(1),
    limitPerProject: z.number().int().min(1).max(5).default(5),
    limitTotal: z.number().int().min(1).max(15).default(15),
  }),
  z.object({
    mode: z.literal('project_scope'),
    query: z.string(),
    projectCode: z.string().min(1),
    limitPerProject: z.number().int().min(1).max(5).default(5),
    limitTotal: z.number().int().min(1).max(15).default(15),
  }),
])

export type SearchRequest = z.infer<typeof SearchRequestSchema>

// ---------------------------------------------------------------------------
// SearchResponseSchema
// ---------------------------------------------------------------------------

export const SearchResponseSchema = z.object({
  results: z.array(
    z.object({
      ticket: z.object({
        code: z.string(),
        title: z.string(),
      }),
      project: z.object({
        code: z.string(),
        name: z.string(),
      }),
    }),
  ),
  total: z.number().int().min(0),
})

export type SearchResponse = z.infer<typeof SearchResponseSchema>

// ---------------------------------------------------------------------------
// SearchErrorCode enum
// ---------------------------------------------------------------------------

export const SearchErrorCode = {
  PROJECT_NOT_FOUND: 'project_not_found',
  TICKET_NOT_FOUND: 'ticket_not_found',
  VALIDATION_ERROR: 'validation_error',
} as const

export type SearchErrorCode = (typeof SearchErrorCode)[keyof typeof SearchErrorCode]
