import type { Project } from '../../models/Project.js'
import type {
  Ticket,
  TicketFilters,
} from '../../models/Ticket.js'
import type { ReadResult } from '../project/types.js'
import type { ProjectService } from '../ProjectService.js'
import type { TicketLocationResolver } from '../ticket/TicketLocationResolver.js'
import type {
  GetTicketRequest,
  ListTicketsRequest,
  TicketReadResult,
} from '../ticket/types.js'
import type { TicketRepository } from './TicketRepository.js'
import * as path from 'node:path'

import { getTicketsPath } from '../../models/Project.js'

import { DEFAULTS } from '../../utils/constants.js'

import { resolveExternalReferences } from '../externalReferences.js'
import { ServiceError } from '../ServiceError.js'
import { ticketSearchProvenance } from '../ticket/referenceSearch.js'

import { assertUnambiguousTicket, TicketIdentityConflictError } from '../ticket/TicketIdentityService.js'

function fuzzyMatch(haystack: string, needle: string): boolean {
  if (!needle)
    return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export class TicketQueryService {
  constructor(private projectService: Pick<ProjectService, 'getProject' | 'getProjectConfig' | 'getProjectCRs'>, private ticketLocationResolver: Pick<TicketLocationResolver, 'resolve'>, private repository: TicketRepository) {}
  async listTickets(
    request: ListTicketsRequest,
  ): Promise<ReadResult<Ticket[]>> {
    const project = await this.requireProject(request.projectRef)
    let tickets = await this.listCRs(project, request.filters)

    // Apply sorting (default: dateModified newest-first)
    const sortField = request.sort || 'dateModified'
    tickets = this.sortTickets(tickets, sortField)

    // Apply pagination
    const offset = request.offset ?? 0
    const limit = request.limit
    if (limit !== undefined || offset > 0) {
      tickets = tickets.slice(
        offset,
        limit !== undefined ? offset + limit : undefined,
      )
    }

    return { data: tickets }
  }

  async getTicket(request: GetTicketRequest): Promise<TicketReadResult> {
    const project = await this.requireProject(request.projectRef)
    const ticket = await this.getCR(project, request.ticketKey)

    if (!ticket) {
      throw ServiceError.ticketNotFound(request.ticketKey)
    }

    return { data: ticket }
  }

  public async getCRPath(project: Project): Promise<string> {
    try {
      const config = this.projectService.getProjectConfig(project.project.path)
      if (!config || !config.project) {
        return path.resolve(project.project.path, DEFAULTS.TICKETS_PATH)
      }

      // Use helper function with backward compatibility
      const crPath = getTicketsPath(config, DEFAULTS.TICKETS_PATH)
      return path.resolve(project.project.path, crPath)
    }
    catch {
      // Fallback to default path on error
      return path.resolve(project.project.path, DEFAULTS.TICKETS_PATH)
    }
  }

  async listCRs(project: Project, filters?: TicketFilters): Promise<Ticket[]> {
    try {
      // Use shared ProjectService to get CRs with correct path resolution
      const crs = (await this.projectService.getProjectCRs(project)).map(ticket => this.withExternalReferences(project, ticket))

      // Apply filters if provided
      let filteredCRs = crs
      if (filters) {
        filteredCRs = crs.filter(cr => this.matchesFilters(cr, filters))
      }

      // Sort by ticket code (natural sort, DESC - newest/highest numbers first)
      return filteredCRs.sort((a, b) => {
        const aNum = this.extractTicketNumber(a.code)
        const bNum = this.extractTicketNumber(b.code)

        if (aNum !== bNum) {
          return bNum - aNum // DESC: higher numbers first
        }

        // Fallback to reverse string comparison if numbers are equal
        return b.code.localeCompare(a.code)
      })
    }
    catch {
      return []
    }
  }

  async getCR(project: Project, key: string): Promise<Ticket | null> {
    try {
      const inventory = await this.repository.inventory(project)
      assertUnambiguousTicket(inventory, key)
      const location = await this.ticketLocationResolver.resolve(project, key)

      // Read the exact inventoried file. A second first-match directory scan
      // could select a foreign file added between verification and lookup.
      const targetCR = await this.repository.readIdentified(inventory, key, location)
      if (!targetCR)
        return null

      // Add worktree metadata
      return {
        ...this.withExternalReferences(project, targetCR),
        inWorktree: location.isWorktree,
        worktreePath: location.isWorktree ? location.projectRoot : undefined,
      }
    }
    catch (error) {
      if (error instanceof TicketIdentityConflictError)
        throw error
      return null
    }
  }

  private matchesFilters(ticket: Ticket, filters?: TicketFilters): boolean {
    if (!filters)
      return true

    if (filters.query && !filters.query.trim().split(/\s+/).every(term => ticketSearchProvenance(ticket, term).length > 0))
      return false

    if (filters.status) {
      const values = Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      if (!values.some(v => fuzzyMatch(ticket.status, v)))
        return false
    }

    if (filters.type) {
      const values = Array.isArray(filters.type)
        ? filters.type
        : [filters.type]
      if (!values.some(v => fuzzyMatch(ticket.type, v)))
        return false
    }

    if (filters.priority) {
      const values = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority]
      if (!values.some(v => fuzzyMatch(ticket.priority, v)))
        return false
    }

    if (filters.level) {
      // Exact enum match: level is a normalized enum, not a fuzzy label.
      const values = Array.isArray(filters.level)
        ? filters.level
        : [filters.level]
      if (!values.includes((ticket.level || 'ticket')))
        return false
    }

    if (filters.assignee) {
      const values = Array.isArray(filters.assignee)
        ? filters.assignee
        : [filters.assignee]
      if (!values.some(v => fuzzyMatch(ticket.assignee || '', v)))
        return false
    }

    if (filters.component) {
      const values = Array.isArray(filters.component)
        ? filters.component
        : [filters.component]
      if (!values.some(v => fuzzyMatch(ticket.component || '', v)))
        return false
    }

    if (filters.phaseEpic) {
      const values = Array.isArray(filters.phaseEpic)
        ? filters.phaseEpic
        : [filters.phaseEpic]
      if (!values.some(v => fuzzyMatch(ticket.phaseEpic || '', v)))
        return false
    }

    if (filters.dateRange) {
      if (
        filters.dateRange.start
        && ticket.dateCreated
        && ticket.dateCreated < filters.dateRange.start
      ) {
        return false
      }
      if (
        filters.dateRange.end
        && ticket.dateCreated
        && ticket.dateCreated > filters.dateRange.end
      ) {
        return false
      }
    }

    return true
  }

  private extractTicketNumber(code: string): number {
    const match = code.match(/-(\d+)$/)
    return match ? Number.parseInt(match[1], 10) : 0
  }

  private sortTickets(tickets: Ticket[], sortField: string): Ticket[] {
    return [...tickets].sort((a, b) => {
      switch (sortField) {
        case 'dateModified': {
          const aDate = a.lastModified?.getTime() ?? 0
          const bDate = b.lastModified?.getTime() ?? 0
          return bDate - aDate // newest first
        }
        case 'dateCreated': {
          const aDate = a.dateCreated?.getTime() ?? 0
          const bDate = b.dateCreated?.getTime() ?? 0
          return bDate - aDate // newest first
        }
        case 'code': {
          const aNum = this.extractTicketNumber(a.code)
          const bNum = this.extractTicketNumber(b.code)
          if (aNum !== bNum)
            return aNum - bNum
          return a.code.localeCompare(b.code)
        }
        default:
          return 0
      }
    })
  }

  private async requireProject(projectRef: string): Promise<Project> {
    const result = await this.projectService.getProject(projectRef)
    return result.data
  }

  private referenceTrackers(project: Project): unknown {
    return this.projectService.getProjectConfig(project.project.path)?.trackers
  }

  withExternalReferences(project: Project, ticket: Ticket): Ticket {
    return ticket.refs === undefined
      ? ticket
      : {
          ...ticket,
          externalRefs: resolveExternalReferences(ticket.refs, this.referenceTrackers(project)),
        }
  }
}
