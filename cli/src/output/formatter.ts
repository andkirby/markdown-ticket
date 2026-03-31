/**
 * CLI Output Formatter (MDT-143)
 *
 * Centralizes all terminal output formatting for the CLI.
 * Owns all human-readable output with optional color support.
 *
 * All formatting passes through this module - commands should
 * call formatter functions and console.log/print the result.
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import type { Project } from '@mdt/shared/models/Project.js'
import type { AttrOperation } from '@mdt/shared/services/ticket/types.js'
import { shouldUseColor, colorizeStatus, colorizePriority, colorizeType, colorizeTitle, colorizeTicketKey, colorizeProjectCode, colorizeProjectId, colorizePath, badge, visiblePadEnd, statusDisplayLabel } from './colors.js'
import { getCliConfig } from '../utils/cliConfig.js'

/**
 * Format ticket details for console output
 *
 * Output format:
 * ```
 * MDT-143 CLI access to tickets and projects
 * ────────────────────────────────────────────────────────────
 *   status     In Progress           type       Feature Enhancement
 *   priority   Medium                phase      Phase B (Enhancement)
 *   created    2026-03-15            modified   2026-03-20
 * ────────────────────────────────────────────────────────────
 *   path: docs/CRs/MDT-143-cli-entrypoint-alternative-to-mcp.md
 * ```
 *
 * @param ticket - Ticket to format
 * @param projectPath - Optional project root path for relative path calculation
 * @returns Formatted ticket view
 */
export function formatTicketView(ticket: Ticket, projectPath?: string): string {
  const lines: string[] = []
  const useColor = shouldUseColor()

  // Header line with per-element colors
  lines.push(`${useColor ? colorizeTicketKey(ticket.code) : ticket.code} ${useColor ? colorizeTitle(ticket.title) : ticket.title}`)
  lines.push('─'.repeat(60))

  // Metadata fields (2-column layout)
  const fields: Array<{ label: string; value: string; colorFn?: (s: string) => string }> = [
    { label: 'status', value: ticket.status, colorFn: useColor ? colorizeStatus : undefined },
    { label: 'type', value: ticket.type, colorFn: useColor ? colorizeType : undefined },
    { label: 'priority', value: ticket.priority, colorFn: useColor ? colorizePriority : undefined },
  ]

  if (ticket.phaseEpic) {
    fields.push({ label: 'phase', value: ticket.phaseEpic })
  }

  if (ticket.assignee) {
    fields.push({ label: 'assignee', value: ticket.assignee })
  }

  if (ticket.dateCreated) {
    fields.push({ label: 'created', value: ticket.dateCreated.toISOString().split('T')[0] })
  }

  if (ticket.lastModified) {
    fields.push({ label: 'modified', value: ticket.lastModified.toISOString().split('T')[0] })
  }

  // Format fields in 2-column layout
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i]
    const right = fields[i + 1]

    if (left && right) {
      const leftValue = left.colorFn ? left.colorFn(left.value) : left.value
      const rightValue = right.colorFn ? right.colorFn(right.value) : right.value
      lines.push(`  ${left.label.padEnd(10)} ${leftValue.padEnd(20)}  ${right.label.padEnd(10)} ${rightValue}`)
    }
    else if (left) {
      const leftValue = left.colorFn ? left.colorFn(left.value) : left.value
      lines.push(`  ${left.label.padEnd(10)} ${leftValue}`)
    }
  }

  lines.push('─'.repeat(60))

  // File path (relative or absolute based on config, colored gray)
  if (ticket.filePath) {
    const displayPath = formatPath(ticket.filePath, projectPath)
    lines.push(`  path: ${useColor ? colorizePath(displayPath) : displayPath}`)
  }

  // Worktree indicator
  if (ticket.inWorktree && ticket.worktreePath) {
    lines.push(`  (in worktree: ${ticket.worktreePath})`)
  }

  return lines.join('\n')
}

/**
 * Format ticket list for console output
 *
 * Output format:
 * ```
 * MDT-012 Add CLI access to tickets and projects
 *   Implemented | Feature | High | Phase B
 *   docs/CRs/MDT-012-add-cli-access.md
 * ```
 *
 * @param tickets - Tickets to format
 * @param projectCode - Project code for summary
 * @param projectPath - Optional project root path for relative path calculation
 * @returns Formatted ticket list
 */
export function formatTicketList(tickets: Ticket[], projectCode: string, projectPath?: string): string {
  const lines: string[] = []
  const useColor = shouldUseColor()

  for (const ticket of tickets) {
    // Header line: CODE Title
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

    // Path line (colored gray)
    if (ticket.filePath) {
      const displayPath = formatPath(ticket.filePath, projectPath)
      lines.push(`  ${useColor ? colorizePath(displayPath) : displayPath}`)
    }

    // Worktree indicator
    if (ticket.inWorktree && ticket.worktreePath) {
      lines.push(`  (in worktree: ${ticket.worktreePath})`)
    }

    lines.push('') // Blank line between tickets
  }

  // Summary line
  lines.push(`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} in ${projectCode} project`)

  return lines.join('\n')
}

/**
 * Format project details for console output
 *
 * Output format:
 * ```
 * MDT (markdown-ticket)
 *   name         Markdown Ticket Board
 *   description  Kanban board with markdown-based tickets and MCP integration
 *   path         /Users/kirby/home/markdown-ticket
 *   ticketsPath  docs/CRs
 *   config       .mdt-config.toml
 * ```
 *
 * @param project - Project to format
 * @returns Formatted project view
 */
export function formatProjectView(project: Project): string {
  const lines: string[] = []
  const useColor = shouldUseColor()

  // Header line: CODE (identifier) with per-element colors
  const code = useColor ? colorizeProjectCode(project.project.code) : project.project.code
  const id = useColor ? colorizeProjectId(project.id) : project.id
  lines.push(`${code} (${id})`)

  // Metadata fields (2-column layout where possible)
  const fields = [
    { label: 'name', value: project.project.name },
    { label: 'description', value: project.project.description || '' },
  ]

  // Format fields
  for (const field of fields) {
    if (field.value) {
      lines.push(`  ${field.label.padEnd(12)} ${field.value}`)
    }
  }

  // Path and configuration (colored gray)
  const projectPath = useColor ? colorizePath(project.project.path) : project.project.path
  lines.push(`  ${'path'.padEnd(12)} ${projectPath}`)
  lines.push(`  ${'ticketsPath'.padEnd(12)} ${project.project.ticketsPath}`)
  lines.push(`  ${'config'.padEnd(12)} ${project.project.configFile || '(global-only)'}`)

  return lines.join('\n')
}

/**
 * Format project list for console output
 *
 * Output format:
 * ```
 * MDT | markdown-ticket | Markdown Ticket Board
 *   Kanban board with markdown-based tickets and MCP integration
 *   /Users/kirby/home/markdown-ticket
 *
 * API | api-server | API Server
 *   /Users/kirby/home/api-server
 *
 * 2 projects
 * ```
 *
 * @param projects - Projects to format
 * @returns Formatted project list
 */
export function formatProjectList(projects: Project[]): string {
  const lines: string[] = []
  const useColor = shouldUseColor()

  for (const project of projects) {
    // Header line: CODE | Name
    const code = useColor ? colorizeProjectCode(project.project.code) : project.project.code
    const name = useColor ? colorizeTitle(project.project.name) : project.project.name
    lines.push(`${code} ${name}`)

    // Description (if present)
    if (project.project.description) {
      lines.push(`  ${project.project.description}`)
    }

    // Path (colored gray)
    const projectPath = useColor ? colorizePath(project.project.path) : project.project.path
    lines.push(`  ${projectPath}`)

    // Blank line between projects
    lines.push('')
  }

  // Summary line
  lines.push(`${projects.length} project${projects.length !== 1 ? 's' : ''}`)

  return lines.join('\n')
}

/**
 * Format ticket creation success message
 *
 * @param ticketKey - Created ticket key
 * @param ticketPath - Path to ticket file
 * @param projectPath - Optional project root path for relative path calculation
 * @returns Formatted creation message
 */
export function formatTicketCreate(ticketKey: string, ticketPath: string, projectPath?: string): string {
  const lines: string[] = []
  const useColor = shouldUseColor()

  const displayPath = formatPath(ticketPath, projectPath)
  const coloredKey = useColor ? colorizeTicketKey(ticketKey) : ticketKey
  lines.push(`Created ${coloredKey}`)
  lines.push(`  ${useColor ? colorizePath(displayPath) : displayPath}`)

  return lines.join('\n')
}

/**
 * Result of a single attribute update operation
 */
export interface AttrUpdateResult {
  field: string
  op: AttrOperation['op']
  oldValue: string
  newValue: string
}

/**
 * Reverse field mapping for CLI display
 */
const REVERSE_FIELD_MAPPING: Record<string, string> = {
  priority: 'priority',
  phaseEpic: 'phase',
  assignee: 'assignee',
  relatedTickets: 'related',
  dependsOn: 'depends',
  blocks: 'blocks',
  implementationDate: 'impl-date',
  implementationNotes: 'impl-notes',
  status: 'status',
}

/**
 * Format ticket attribute update confirmation (pipe-separated format)
 *
 * Format: `Updated MDT-143 | status: In Progress → Implemented`
 * No-op:  `MDT-143 | status: unchanged (Implemented)`
 *
 * @param ticketKey - Ticket key
 * @param results - Array of update results with old/new values
 * @returns Formatted attribute update message
 */
export function formatTicketAttrPipe(ticketKey: string, results: AttrUpdateResult[]): string {
  const useColor = shouldUseColor()
  const coloredKey = useColor ? colorizeTicketKey(ticketKey) : ticketKey
  const lines: string[] = []

  for (const result of results) {
    const cliField = REVERSE_FIELD_MAPPING[result.field] || result.field
    const isNoop = result.oldValue === result.newValue

    if (isNoop) {
      lines.push(`${coloredKey} | ${cliField}: unchanged (${result.newValue})`)
    }
    else {
      lines.push(`${coloredKey} | ${cliField}: ${result.oldValue} → ${result.newValue}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format ticket attribute update confirmation (legacy format)
 *
 * @param ticketKey - Ticket key
 * @param operations - Operations applied
 * @returns Formatted attribute update message
 */
export function formatTicketAttr(ticketKey: string, operations: AttrOperation[]): string {
  const lines: string[] = []

  lines.push(`Updated ${ticketKey}:`)

  for (const operation of operations) {
    const cliField = REVERSE_FIELD_MAPPING[operation.field] || operation.field

    if (operation.op === 'replace') {
      const value = Array.isArray(operation.value) ? operation.value.join(', ') : operation.value
      lines.push(`  ${cliField} → ${value}`)
    }
    else if (operation.op === 'add') {
      const value = Array.isArray(operation.value) ? operation.value.join(', ') : operation.value
      lines.push(`  ${cliField} += ${value}`)
    }
    else if (operation.op === 'remove') {
      const value = Array.isArray(operation.value) ? operation.value.join(', ') : operation.value
      lines.push(`  ${cliField} -= ${value}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format file path based on CLI configuration
 *
 * - If absolutePath config is true: show absolute path
 * - Otherwise: show path relative to project root
 *
 * @param filePath - File path to format
 * @param projectPath - Optional project root path
 * @returns Formatted path (absolute or relative)
 */
function formatPath(filePath: string, projectPath?: string): string {
  const config = getCliConfig()

  // If absolute path is configured, return absolute path
  if (config.ticket.absolutePath || !projectPath) {
    return filePath
  }

  // Try to make path relative to project root
  // Remove leading project path if present
  if (filePath.startsWith(projectPath)) {
    const relativePath = filePath.slice(projectPath.length)
    // Remove leading slash if present
    return relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
  }

  // If path doesn't start with project path, return as-is
  return filePath
}
