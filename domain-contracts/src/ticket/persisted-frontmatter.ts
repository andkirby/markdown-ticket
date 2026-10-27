import { z } from 'zod'
import { ExternalReferencesSchema } from './external-reference'
import { TicketFrontmatterSchema } from './frontmatter'

// Persisted frontmatter is normalized by the shared ticket adapter. It is not
// a create/entity contract: old enums, missing fields, date variants and mixed
// relationship arrays keep their established fallback semantics.
const text = z.string().optional().catch(undefined)
const date = z.union([z.string(), z.custom<Date>(value => value instanceof Date)]).optional().catch(undefined)
const relationship = z.union([z.string(), z.array(z.unknown())]).optional().catch(undefined)
export const PersistedTicketFrontmatterSchema = z.looseObject({
  ...Object.fromEntries(Object.keys(TicketFrontmatterSchema.shape).map(key => [key, text])),
  creationId: text,
  code: text,
  key: text,
  title: text,
  status: text,
  type: text,
  priority: text,
  level: text,
  dateCreated: date,
  lastModified: date,
  implementationDate: date,
  relatedTickets: relationship,
  dependsOn: relationship,
  blocks: relationship,
  refs: ExternalReferencesSchema.optional().catch(undefined),
})
