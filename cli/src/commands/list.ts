/**
 * CLI Ticket List Command (MDT-143)
 *
 * Implements ticket list command using shared services.
 * Resolves project context and displays tickets with filtering, sorting, and pagination.
 * Filtering, sorting, and pagination are shared concerns — CLI only parses argv.
 */

import type { ListTicketsSort } from '@mdt/shared/services/ticket/types.js'
import type { StructuredOutputOptions } from '../output/structured.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ServiceError } from '@mdt/shared/services/ServiceError.js'
import { DEFAULT_LIST_LIMIT } from '@mdt/shared/services/ticket/types.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatTicketListFiles, formatTicketList as formatTicketListFormatter, formatTicketListInfo } from '../output/formatter.js'
import { CliCommandError, formatProjectForStructured, formatTicketForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'
import { PRIORITY_TOKENS, STATUS_ALIASES, TYPE_TOKENS } from '../utils/aliases.js'

/**
 * List command options
 */
interface ListCommandOptions extends StructuredOutputOptions {
  all?: boolean
  limit?: number
  offset?: number
  files?: boolean
  info?: boolean
  project?: string
}

/**
 * Filterable field names and their mapping to TicketFilters keys
 */
const FILTER_FIELD_MAPPING: Record<string, string> = {
  status: 'status',
  priority: 'priority',
  type: 'type',
  assignee: 'assignee',
  phase: 'phaseEpic',
  epic: 'phaseEpic',
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
    if (!arg.includes('='))
      continue

    const eqIndex = arg.indexOf('=')
    const key = arg.slice(0, eqIndex).toLowerCase().trim()
    const value = arg.slice(eqIndex + 1).trim()

    if (!key || !value)
      continue

    const filterField = FILTER_FIELD_MAPPING[key]
    if (!filterField)
      continue

    // Normalize value based on field type
    if (filterField === 'status') {
      const values = value.split(',').map((v) => {
        const normalized = v.trim().toLowerCase().replace(/[\s-]+/g, '_')
        return STATUS_ALIASES[normalized] || v.trim()
      })
      filters[filterField] = values
    }
    else if (filterField === 'priority') {
      const values = value.split(',').map((v) => {
        const normalized = v.trim().toLowerCase()
        return PRIORITY_TOKENS[normalized] || v.trim()
      })
      filters[filterField] = values
    }
    else if (filterField === 'type') {
      const values = value.split(',').map((v) => {
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
 * Ticket list action handler
 *
 * @param filterArgs - Positional filter arguments (key=value format)
 * @param options - Command options
 * @throws Process.exit(1) on error
 */
export async function ticketListAction(filterArgs: string[] = [], options: ListCommandOptions = {}): Promise<void> {
  // Resolve project: explicit --project wins, otherwise cwd detection
  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)
  let projectCode: string
  let projectPath: string

  if (options.project) {
    const resolved = await projectService.getProjectByCodeOrId(options.project)
    if (!resolved) {
      throw new CliCommandError('PROJECT_NOT_FOUND', `Project ${options.project} not found`, { projectCode: options.project })
    }
    projectCode = resolved.project.code
    projectPath = resolved.project.path
  }
  else {
    const projectResult = await projectService.resolveCurrentProject()
    if (!projectResult.data) {
      throw new CliCommandError('NO_PROJECT_CONTEXT', 'No project context. Run from a project directory.')
    }
    projectCode = projectResult.data.project.code
    projectPath = projectResult.data.project.path
  }

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
  const listRequest = {
    projectRef: projectCode,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort,
    limit,
    offset: options.offset,
  }

  const result = await ticketService.listTickets(listRequest)

  const totalResult = await ticketService.listTickets({
    projectRef: projectCode,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sort,
  })

  const tickets = result.data
  const outputFormat = getOutputFormat(options)

  // Format output based on mode
  if (outputFormat !== 'human') {
    const project = await projectService.getProjectByCodeOrId(projectCode)
    if (!project) {
      throw ServiceError.projectNotFound(projectCode)
    }
    writeStructuredSuccess(
      outputFormat,
      'ticket.list',
      {
        items: tickets.map(ticket => formatTicketForStructured(ticket, projectPath)),
        count: {
          total: totalResult.data.length,
          returned: tickets.length,
        },
        filters,
        sort,
        pagination: {
          limit: limit ?? null,
          offset: options.offset ?? 0,
          all: options.all ?? false,
        },
        outputMode: {
          files: options.files ?? false,
          info: options.info ?? false,
        },
        project: formatProjectForStructured(project),
      },
      {
        projectCode,
        projectId: project.id,
      },
    )
  }
  else if (options.files) {
    console.log(formatTicketListFiles(tickets, projectPath))
  }
  else if (options.info) {
    console.log(formatTicketListInfo(tickets, projectCode))
  }
  else {
    console.log(formatTicketListFormatter(tickets, projectCode, projectPath))
  }
}
