/**
 * CLI Ticket Rename Command
 *
 * Renames a ticket: updates the H1 title and file slug.
 * Usage: mdt-cli ticket rename <key> 'New Title' [new-slug]
 */

import process from 'node:process'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { KeyNormalizationError, normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { formatTicketRename } from '../output/formatter.js'

/**
 * Parse ticket key to extract project code and ticket key
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
      ticketKey: ticketKeyPart,
    }
  }

  // Full format with project code: "ABC-12"
  const fullFormatMatch = key.match(/^([a-z][a-z0-9]*)-(\d+)$/i)
  if (fullFormatMatch) {
    const [, projectCode] = fullFormatMatch
    return {
      projectCode: projectCode.toUpperCase(),
      ticketKey: key,
    }
  }

  // Numeric or other shorthand - return null to use current project
  return null
}

/**
 * Ticket rename action handler
 *
 * @param key - Ticket key (numeric shorthand, full format, or cross-project)
 * @param tokens - Remaining tokens: new title (required) and optional slug
 */
export async function ticketRenameAction(key: string, tokens: string[]): Promise<void> {
  if (!tokens || tokens.length === 0) {
    console.error('Error: No title specified. Usage: mdt-cli ticket rename <key> \'New Title\' [new-slug]')
    process.exit(1)
  }

  let newTitle: string | null = null
  let newSlug: string | null = null

  for (const token of tokens) {
    // Quoted text → title
    if ((token.startsWith('\'') && token.endsWith('\''))
      || (token.startsWith('"') && token.endsWith('"'))) {
      newTitle = token.slice(1, -1)
      continue
    }

    // Unquoted token with dashes → slug (only if we already have a title)
    if (newTitle && token.includes('-')) {
      newSlug = token
      continue
    }

    // First unquoted token → title
    if (!newTitle) {
      newTitle = token
    }
  }

  if (!newTitle) {
    console.error('Error: No title specified. Usage: mdt-cli ticket rename <key> \'New Title\' [new-slug]')
    process.exit(1)
  }

  const projectService = new ProjectService(true)
  const ticketService = new TicketService(true)

  let projectCode: string
  let ticketKey: string

  const parsed = parseTicketKey(key)

  if (parsed) {
    projectCode = parsed.projectCode
    ticketKey = parsed.ticketKey
  }
  else {
    const projectResult = await projectService.resolveCurrentProject()

    if (!projectResult.data) {
      console.error('Error: No project context. Run from a project directory or use an explicit key like MDT-143.')
      process.exit(1)
    }

    projectCode = projectResult.data.project.code

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

  try {
    const projects = await projectService.getAllProjects()
    const project = projects.find(p => p.project.code === projectCode)
    if (!project) {
      console.error(`Error: Project '${projectCode}' not found`)
      process.exit(1)
    }

    const oldTicket = await ticketService.getCR(project, ticketKey)
    if (!oldTicket) {
      console.error(`Error: Ticket ${ticketKey} not found`)
      process.exit(1)
    }

    const oldTitle = oldTicket.title
    const oldPath = oldTicket.filePath

    const updated = await ticketService.renameTicket(
      project,
      ticketKey,
      newTitle,
      newSlug ?? undefined,
    )

    console.log(formatTicketRename(ticketKey, oldTitle, updated.title, oldPath, updated.filePath))
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}
