import type { ProjectConfig } from '../../models/Project.js'

export interface ResolvedTicketLocation {
  projectRoot: string
  ticketDir: string
  ticketsPath: string
  isWorktree: boolean
}

export interface SubdocumentReadResult {
  code: string
  content: string
  dateCreated: Date | null
  lastModified: Date | null
}

export interface NamespaceParseResult {
  namespace: string
  subKey: string
}

export interface ProjectConfigLookup {
  getProjectConfig: (path: string) => ProjectConfig | null
}
