import type { Ticket as DomainTicket } from '@mdt/domain-contracts'
import type { Project, ProjectConfig } from '@mdt/shared/models/Project.js'
import type { TicketMetadata } from '@mdt/shared/models/Ticket.js'
import type { ProjectUpdateInput } from '@mdt/shared/tools/ProjectManager.js'
import type { Request } from 'express'
import type { RequestAccessContext } from '../../security/apiAuth.js'
import type { TreeNode } from '../../types/tree.js'

export type Ticket = Pick<DomainTicket, 'code' | 'filePath'>

interface DirectoryListing {
  currentPath: string
  parentPath: string
  directories: {
    name: string
    path: string
    isDirectory: boolean
  }[]
}

export interface AuthenticatedRequest extends Request {
  mdtAccess?: RequestAccessContext
  params: {
    projectId?: string
    code?: string
    crId?: string
  }
  query: {
    projectId?: string
    path?: string
    bypassCache?: string
    after?: string
    limit?: string
  }
  body: unknown
}

// Catalog operations consumed by HTTP capabilities; the shared service implements this port.
export interface ProjectServiceExtension {
  getAllProjects: (bypassCache?: boolean) => Promise<Project[]>
  getProjectConfig: (path: string) => ProjectConfig | null
  getProjectCRs: (project: Project) => Promise<Ticket[]>
  getProjectCRsMetadata: (project: Project) => Promise<TicketMetadata[]>
  getSystemDirectories: (path?: string) => Promise<DirectoryListing>
  configureDocuments: (projectId: string, documentPaths: string[]) => Promise<void>
  updateProject?: (projectId: string, updates: ProjectUpdateInput) => void
  updateProjectByPath?: (projectId: string, projectPath: string, updates: ProjectUpdateInput) => void
  updateVisibleProject?: (project: Project, updates: ProjectUpdateInput) => void
  clearCache?: () => void | Promise<void>
}

export interface TreeServiceInterface {
  getPathSelectionTree: (projectId: string) => Promise<TreeNode[]>
}

export interface FileWatcher {
  reconfigureDocumentWatchers?: (projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string) => Promise<number>
  disconnectReadOnlyClients?: () => void
}
