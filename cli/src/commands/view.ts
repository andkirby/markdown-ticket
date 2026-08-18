import type { Project } from '@mdt/shared/models/Project.js'
/**
 * CLI Ticket View Command (MDT-143)
 *
 * Implements ticket get/view command using shared services.
 * Resolves project context, normalizes keys, and displays ticket details.
 */

import type { StructuredOutputOptions } from '../output/structured.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatCrKey, KeyNormalizationError, normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { formatTicketView } from '../output/formatter.js'
import { CliCommandError, formatTicketForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'

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

/** Options for ticket get (extends structured output with --project). */
interface ViewCommandOptions extends StructuredOutputOptions {
  project?: string
}

/**
 * Resolve a ticket key inside an explicitly given project (MDT-143 UAT).
 *
 * `--project` wins over cwd detection and over project codes embedded in the
 * key: the numeric part of the key (from "12", "ABC-12", or "PROJ/ABC-12") is
 * rebuilt under the given project's code.
 */
function resolveKeyInProject(key: string, projectCode: string): string {
  const bare = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
  const fullFormat = bare.match(/^([a-z][a-z0-9]*)-(\d+)$/i)
  if (fullFormat) {
    return formatCrKey(projectCode, Number.parseInt(fullFormat[2], 10))
  }
  return normalizeKey(bare, projectCode)
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
export async function ticketViewAction(key: string, options: ViewCommandOptions = {}): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)

  let projectCode: string
  let ticketKey: string
  let project: Project | undefined

  // Try to parse the key
  const parsed = parseTicketKey(key)

  if (options.project) {
    // Explicit --project wins over cwd detection and key-embedded codes
    const resolved = await projectService.getProjectByCodeOrId(options.project)
    if (!resolved) {
      throw new CliCommandError(
        'PROJECT_NOT_FOUND',
        `Project ${options.project} not found`,
        { projectCode: options.project },
      )
    }
    projectCode = resolved.project.code
    project = resolved
    try {
      ticketKey = resolveKeyInProject(key, projectCode)
    }
    catch (error) {
      if (error instanceof KeyNormalizationError) {
        throw new CliCommandError(
          'INVALID_TICKET_KEY',
          `Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`,
        )
      }
      throw error
    }
  }
  else if (parsed) {
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
      throw new CliCommandError(
        'NO_PROJECT_CONTEXT',
        'No project context. Run from a project directory or use an explicit key like MDT-143.',
      )
    }

    projectCode = projectResult.data.project.code
    project = projectResult.data

    // Normalize the key using current project code
    try {
      ticketKey = normalizeKey(key, projectCode)
    }
    catch (error) {
      if (error instanceof KeyNormalizationError) {
        throw new CliCommandError(
          'INVALID_TICKET_KEY',
          `Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`,
        )
      }
      throw error
    }
  }

  // If we have a full format key from cross-project parsing, normalize it
  if (!options.project && parsed && !ticketKey.includes('/')) {
    try {
      ticketKey = normalizeKey(ticketKey, projectCode)
    }
    catch (error) {
      if (error instanceof KeyNormalizationError) {
        throw new CliCommandError(
          'INVALID_TICKET_KEY',
          `Invalid key format '${key}'. Expected: numeric shorthand, full format ABC-012, or cross-project ABC/DEF-012`,
        )
      }
      throw error
    }
  }

  const result = await ticketService.getTicket({
    projectRef: projectCode,
    ticketKey,
  })

  const projectPath = project?.project.path
  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    writeStructuredSuccess(
      outputFormat,
      'ticket.get',
      {
        ticket: formatTicketForStructured(result.data, projectPath),
      },
      {
        projectCode,
        projectId: project?.id ?? null,
      },
    )
    return
  }

  console.log(formatTicketView(result.data, projectPath))
}
