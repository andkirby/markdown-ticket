/**
 * CLI Ticket List Command (MDT-143)
 *
 * Implements ticket list command using shared services.
 * Resolves project context and displays tickets with filtering, sorting, and pagination.
 * Filtering, sorting, and pagination are shared concerns — CLI only parses argv.
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import process from 'node:process'
import { DEFAULT_LIST_LIMIT, type ListTicketsSort } from '@mdt/shared/services/ticket/types.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatTicketList as formatTicketListFormatter } from '../output/formatter.js'
import { badge, colorizePriority, colorizeStatus, colorizeTicketKey, colorizeTitle, colorizeType, shouldUseColor, visiblePadEnd, statusDisplayLabel } from '../output/colors.js'
import { PRIORITY_TOKENS, STATUS_ALIASES, TYPE_TOKENS } from '../utils/aliases.js'

/**
 * List command options
 */
export interface ListCommandOptions {
  json?: boolean
  all?: boolean
  limit?: number
  offset?: number
  files?: boolean
  info?: boolean
}

/**
 * Filterable field names and their mapping to TicketFilters keys
 */
const FILTER_FIELD_MAPPING: Record<string, string> = {
  'status': 'status',
  'priority': 'priority',
  'type': 'type',
  'assignee': 'assignee',
  'phase': 'phaseEpic',
  'epic': 'phaseEpic',
}

/**
 * Parse positional filter arguments into TicketFilters
 *
 * Format: key=value, key=value1,value2 (comma-separated OR within field)
 * AND across fields, fuzzy matching within each field
 *
 * @param filterArgs - Positional arguments that look like key=value
 * @returns Parsed TicketFilters
 */
function parseFilters(filterArgs: string[]): Record<string, string | string[]> {
  const filters: Record<string, string | string[]> = {}

  for (const arg of filterArgs) {
    if (!arg.includes('=')) continue

    const eqIndex = arg.indexOf('=')
    const key = arg.slice(0, eqIndex).toLowerCase().trim()
    const value = arg.slice(eqIndex + 1).trim()

    if (!key || !value) continue

    const filterField = FILTER_FIELD_MAPPING[key]
    if (!filterField) continue

    // Normalize value based on field type
    if (filterField === 'status') {
      const values = value.split(',').map(v => {
        const normalized = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
        return STATUS_ALIASES[normalized] || v.trim()
      })
      filters[filterField] = values
    }
    else if (filterField === 'priority') {
      const values = value.split(',').map(v => {
        const normalized = v.trim().toLowerCase()
        return PRIORITY_TOKENS[normalized] || v.trim()
      })
      filters[filterField] = values
    }
    else if (filterField === 'type') {
      const values = value.split(',').map(v => {
        const normalized = v.trim().toLowerCase()
        return TYPE_TOKENS[normalized] || v.trim()
      })
      filters[filterField] = values
    }
    else {
      // assignee, phaseEpic — pass through as-is (fuzzy matching in shared)
      const values = value.split(',').map(v => v.trim()).filter(Boolean)
      filters[filterField] = values.length === 1 ? values[0]! : values
    }
  }

  return filters
}

/**
 * Format ticket list as JSON
 */
function formatTicketListJSON(tickets: Ticket[]): string {
  return JSON.stringify(tickets, null, 2)
}

/**
 * Format ticket list as files only (paths only, one per line)
 */
function formatTicketListFiles(tickets: Ticket[], projectPath?: string): string {
  return tickets
    .map(t => t.filePath ? formatRelativePath(t.filePath, projectPath) : '')
    .filter(Boolean)
    .join('\n')
}

/**
 * Format ticket list as info (no path lines)
 */
function formatTicketListInfo(tickets: Ticket[], projectCode: string, _projectPath?: string): string {
  const lines: string[] = []

  for (const ticket of tickets) {
    const useColor = shouldUseColor()
    const code = useColor ? colorizeTicketKey(ticket.code) : ticket.code
    const title = useColor ? colorizeTitle(ticket.title) : ticket.title
    lines.push(`${code} ${title}`)

    // Pipe-separated metadata line with fixed-width columns
    const STATUS_W = 11
    const TYPE_W = 13
    const PRIORITY_W = 8

    const statusPart = visiblePadEnd(useColor ? colorizeStatus(statusDisplayLabel(ticket.status)) : statusDisplayLabel(ticket.status), STATUS_W)
    const typeFirstWord = ticket.type.split(' ')[0] ?? ticket.type
    const typePart = visiblePadEnd(useColor ? colorizeType(typeFirstWord) : typeFirstWord, TYPE_W)
    const metaParts = [statusPart, typePart]
    if (ticket.priority) {
      const priorityPart = visiblePadEnd(useColor ? colorizePriority(ticket.priority) : ticket.priority, PRIORITY_W)
      metaParts.push(priorityPart)
    }
    if (ticket.phaseEpic) {
      metaParts.push(ticket.phaseEpic)
    }
    lines.push(`  ${metaParts.join(' | ')}`)
  }

  lines.push(`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} in ${projectCode} project`)
  return lines.join('\n')
}

/**
 * Make a file path relative to project root
 */
function formatRelativePath(filePath: string, projectPath?: string): string {
  if (!projectPath) return filePath
  if (filePath.startsWith(projectPath)) {
    const relative = filePath.slice(projectPath.length)
    return relative.startsWith('/') ? relative.slice(1) : relative
  }
  return filePath
}

/**
 * Ticket list action handler
 *
 * @param filterArgs - Positional filter arguments (key=value format)
 * @param options - Command options
 * @throws Process.exit(1) on error
 */
export async function ticketListAction(filterArgs: string[] = [], options: ListCommandOptions = {}): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)

  // Resolve current project
  const projectResult = await projectService.resolveCurrentProject()

  if (!projectResult.data) {
    console.error('Error: No project context. Run from a project directory.')
    process.exit(1)
  }

  const projectCode = projectResult.data.project.code
  const projectPath = projectResult.data.project.path

  // Parse positional filter arguments
  const filters = parseFilters(filterArgs || [])

  // Determine limit: --all shows everything, --limit N overrides default, default is 10
  let limit: number | undefined
  if (options.all) {
    limit = undefined // no limit
  }
  else if (options.limit !== undefined) {
    limit = options.limit
  }
  else {
    limit = DEFAULT_LIST_LIMIT
  }

  // Sort field: always dateModified newest-first for now
  const sort: ListTicketsSort = 'dateModified'

  // List tickets with filters, sort, and pagination
  const result = await ticketService.listTickets({
    projectRef: projectCode,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort,
    limit,
    offset: options.offset,
  })

  const tickets = result.data

  // Format output based on mode
  if (options.json) {
    console.log(formatTicketListJSON(tickets))
  }
  else if (options.files) {
    console.log(formatTicketListFiles(tickets, projectPath))
  }
  else if (options.info) {
    console.log(formatTicketListInfo(tickets, projectCode, projectPath))
  }
  else {
    console.log(formatTicketListFormatter(tickets, projectCode, projectPath))
  }
}
