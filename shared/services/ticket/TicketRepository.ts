import type { Project } from '../../models/Project.js'
import type { Ticket, TicketData } from '../../models/Ticket.js'
import type { TicketIdentityInventory } from './TicketIdentityService.js'
import type { ResolvedTicketLocation } from './types.js'

export interface TicketRepository {
  inventory: (project: Project) => Promise<TicketIdentityInventory>
  readIdentified: (inventory: TicketIdentityInventory, key: string, location: ResolvedTicketLocation) => Promise<Ticket | null>
  readContent: (filePath: string) => Promise<string>
  writeContent: (filePath: string, content: string) => Promise<void>
  remove: (filePath: string) => Promise<void>
  scan: (directory: string, root: string) => Promise<Ticket[]>
  updateField: (content: string, field: string, value: string) => string
  slug: (title: string) => string
  create: (ticket: Ticket, data: TicketData, exclusive: boolean, onBodySource?: (source: 'generated' | 'supplied') => void) => Promise<Ticket>
  rename: (ticket: Ticket, key: string, title: string, slug?: string) => Promise<void>
}
