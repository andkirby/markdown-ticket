/**
 * Unified search request/response schemas — MDT-179
 *
 * Zod schemas for the POST /api/search endpoint.
 * Extends (does not replace) existing ticket search schemas.
 */

import { z } from 'zod'
import { SearchScope, SearchScopes, SearchResultType, SearchResultTypes } from './types'

// ---------------------------------------------------------------------------
// UnifiedSearchRequestSchema
// ---------------------------------------------------------------------------

export const UnifiedSearchRequestSchema = z.object({
  query: z.string().min(1),
  scope: z.enum(SearchScopes as unknown as [string, ...string[]]).default(SearchScope.GLOBAL),
  limitPerGroup: z.number().int().min(1).max(10).default(5),
  limitTotal: z.number().int().min(1).max(30).default(15),
})

export type UnifiedSearchRequest = z.infer<typeof UnifiedSearchRequestSchema>

// ---------------------------------------------------------------------------
// Result item schemas (discriminated by type)
// ---------------------------------------------------------------------------

export const ProjectResultItemSchema = z.object({
  type: z.literal(SearchResultType.PROJECT),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
})

export const TicketResultItemSchema = z.object({
  type: z.literal(SearchResultType.TICKET),
  ticketKey: z.string(),
  title: z.string(),
  status: z.string(),
  project: z.object({
    code: z.string(),
    name: z.string(),
  }),
})

export const DocumentResultItemSchema = z.object({
  type: z.literal(SearchResultType.DOCUMENT),
  path: z.string(),
  name: z.string(),
  project: z.object({
    code: z.string(),
    name: z.string(),
  }),
})

export const ResultItemSchema = z.discriminatedUnion('type', [
  ProjectResultItemSchema,
  TicketResultItemSchema,
  DocumentResultItemSchema,
])

export type ProjectResultItem = z.infer<typeof ProjectResultItemSchema>
export type TicketResultItem = z.infer<typeof TicketResultItemSchema>
export type DocumentResultItem = z.infer<typeof DocumentResultItemSchema>
export type ResultItem = z.infer<typeof ResultItemSchema>

// ---------------------------------------------------------------------------
// UnifiedSearchResponseSchema
// ---------------------------------------------------------------------------

export const UnifiedSearchResponseSchema = z.object({
  results: z.array(ResultItemSchema),
  groups: z.array(
    z.object({
      type: z.enum(SearchResultTypes as unknown as [string, ...string[]]),
      label: z.string(),
      items: z.array(ResultItemSchema),
    }),
  ),
  total: z.number().int().min(0),
})

export type UnifiedSearchResponse = z.infer<typeof UnifiedSearchResponseSchema>
