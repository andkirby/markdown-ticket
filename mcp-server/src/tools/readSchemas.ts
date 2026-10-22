import { CRLevelSchema, ProjectReferenceInputSchema } from '@mdt/domain-contracts'
import { z } from 'zod'
import { KeyArgsSchema } from './mutationSchemas.js'

const fuzzy = z.union([z.string(), z.array(z.string())]).optional()
export const ListProjectsArgsSchema = z.object({})
export const ProjectInfoArgsSchema = z.object({ key: ProjectReferenceInputSchema })
// Filters are deliberately strings, not entity enums: substring/case-insensitive
// matching is an existing service contract. Do not normalize before forwarding.
export const ListCRsArgsSchema = KeyArgsSchema.partial({ key: true }).extend({
  filters: z.object({
    status: fuzzy,
    type: fuzzy,
    priority: fuzzy,
    assignee: fuzzy,
    component: fuzzy,
    phaseEpic: fuzzy,
    impactAreas: fuzzy,
    level: z.union([CRLevelSchema, z.array(CRLevelSchema)]).optional(),
    inWorktree: z.boolean().optional(),
    query: z.string().optional(),
    dateRange: z.object({ start: z.date().optional(), end: z.date().optional() }).optional(),
  }).passthrough().optional(),
})
export const GetCRArgsSchema = KeyArgsSchema.extend({ mode: z.enum(['full', 'attributes', 'metadata']).optional() })
