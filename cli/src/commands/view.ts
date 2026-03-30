import type { Project } from '@mdt/shared/models/Project.js'
/**
 * CLI Ticket View Command (MDT-143)
 *
 * Implements ticket get/view command using shared services.
 * Resolves project context, normalizes keys, and displays ticket details.
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import process from 'node:process'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ServiceError } from '@mdt/shared/services/ServiceError.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { KeyNormalizationError, normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { formatTicketView } from '../output/formatter.js'

/**
 * Parse ticket key to extract project code and ticket key
 *
 * Handles:
 * - Cross-project: "ABC/MDT-12" → {projectCode: "ABC", ticketKey: "MDT-012"}
 * - Full format: "ABC-12" → {projectCode: "ABC", ticketKey: "ABC-012"}
 * - Numeric/shorthand: "12" → returns null (uses current project)
 */
interface ParsedKey {
  projectCode: string
  ticketKey: string
}

function parseTicketKey(key: string): ParsedKey | null {
  // Cross-project format: "ABC/MDT-12" or "ABC/12"
  const crossProjectMatch = key.match(/^([^/]+)\/(.+)$/)
  if (crossProjectMatch) {
    const [, projectCode, ticketKeyPart] = crossProjectMatch
    return {
      projectCode: projectCode.toUpperCase(),
      ticketKey: ticketKeyPart, // Will be normalized later
    }
  }

  // Full format with project code: "ABC-12"
  const fullFormatMatch = key.match(/^([a-z][a-z0-9]*)-(\d+)$/i)
  if (fullFormatMatch) {
    const [, projectCode, _number] = fullFormatMatch
    return {
      projectCode: projectCode.toUpperCase(),
      ticketKey: key, // Will be normalized later
    }
  }

  // Numeric or other shorthand - return null to use current project
  return null
}

/**
 * Ticket view action handler
 *
 * @param key - Ticket key (numeric shorthand, full format, or cross-project)
 * @throws Process.exit(1) on error
 */
export async function ticketViewAction(key: string): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)

  let projectCode: string
  let ticketKey: string
  let project: Project | undefined

  // Try to parse the key
  const parsed = parseTicketKey(key)

  if (parsed) {
    // Cross-project or full format - use explicit project code
    projectCode = parsed.projectCode
    ticketKey = parsed.ticketKey

    // Resolve project for path formatting
    const resolvedProject = await projectService.getProjectByCodeOrId(projectCode)
    if (resolvedProject) {
      project = resolvedProject
    }
  }
  else {
    // Numeric or shorthand - need current project context
    const projectResult = await projectService.resolveCurrentProject()

    if (!projectResult.data) {
      console.error('Error: No project context. Run from a project directory or use an explicit key like MDT-143.')
      process.exit(1)
    }

    projectCode = projectResult.data.project.code
    project = projectResult.data

    // Normalize the key using current project code
    try {
      ticketKey = normalizeKey(key, projectCode)
    }
    catch (error) {
      if (error instanceof KeyNormalizationError) {
        console.error(`Error: Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`)
        process.exit(1)
      }
      throw error
    }
  }

  // If we have a full format key from cross-project parsing, normalize it
  if (parsed && !ticketKey.includes('/')) {
    try {
      ticketKey = normalizeKey(ticketKey, projectCode)
    }
    catch (error) {
      if (error instanceof KeyNormalizationError) {
        console.error(`Error: Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`)
        process.exit(1)
      }
      throw error
    }
  }

  // Get the ticket
  try {
    const result = await ticketService.getTicket({
      projectRef: projectCode,
      ticketKey,
    })

    const projectPath = project?.project.path
    console.log(formatTicketView(result.data, projectPath))
  }
  catch (error) {
    if (error instanceof ServiceError && error.code === 'TICKET_NOT_FOUND') {
      console.error(`Error: Ticket ${ticketKey} not found`)
      process.exit(1)
    }
    throw error
  }
}
