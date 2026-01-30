import { z } from 'zod'
import { CR_PRIORITIES, CR_STATUSES, CR_TYPES } from '@mdt/shared/models/Types'

// Core Ticket Interface - matches shared DTO
export interface Ticket {
  // Required Core Attributes
  code: string
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  content: string
  filePath: string

  // Optional Attributes
  phaseEpic?: string
  description?: string
  rationale?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string

  // Relationship fields (always arrays)
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
}

// Ticket Update Interface
interface _TicketUpdate {
  code: string
  updates: Partial<Ticket>
  updateImplementationDate?: boolean
}

// File Event Types
interface _FileEvent {
  type: 'create' | 'update' | 'delete'
  filePath: string
  cr?: Ticket
}

// Suggestion Interface
interface _Suggestion {
  code: string
  title: string
  type: string
  status: string
  matchScore: number
}

// Zod Schemas for Validation
const _TicketSchema = z.object({
  // Required Core Attributes
  code: z.string().regex(/^[A-Z]{2,}-[A-Z]\d{3}$/, 'Invalid ticket code format'),
  title: z.string().min(1, 'Title is required'),
  status: z.string().min(1, 'Status is required'),
  dateCreated: z.date(),
  type: z.string().min(1, 'Type is required'),
  priority: z.string().min(1, 'Priority is required'),
  phaseEpic: z.string().min(1, 'Phase epic is required'),

  // Optional Attributes
  description: z.string().optional(),
  rationale: z.string().optional(),
  relatedTickets: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  implementationDate: z.date().optional(),
  implementationNotes: z.string().optional(),

  // Derived/System Fields
  filePath: z.string(),
  lastModified: z.date(),
  content: z.string(),
})

type _TicketFormData = z.infer<typeof _TicketSchema>

// Status Enum Values - imported from shared types
export type Status = typeof CR_STATUSES[number]

// Type Enum Values - imported from shared types
type _Type = typeof CR_TYPES[number]

// Priority Enum Values - imported from shared types
type _Priority = typeof CR_PRIORITIES[number]
