/**
 * CLI Ticket Create Command (MDT-143)
 *
 * Implements ticket create command with order-independent token parsing.
 * Supports type/priority tokens, quoted titles, and optional slug.
 * Reads content from stdin when piped.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { TicketData } from '@mdt/shared/models/Ticket.js'
import type { StructuredOutputOptions } from '../output/structured.js'
import process from 'node:process'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatTicketCreate } from '../output/formatter.js'
import { CliCommandError, formatTicketForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'
import { DEFAULT_PRIORITY, DEFAULT_TYPE, PRIORITY_TOKENS, TYPE_TOKENS } from '../utils/aliases.js'
import { readStdin } from '../utils/stdin.js'

/**
 * Parsed create tokens
 */
interface ParsedTokens {
  type: string
  priority: string
  title: string
  slug: string | null
}

interface CreateCommandOptions extends StructuredOutputOptions {
  stdin?: boolean
  project?: string
}

/**
 * Parse tokens to extract type, priority, title, and slug
 *
 * Rules:
 * - Type tokens: bug|feature|architecture|tech-debt|documentation|research
 * - Priority tokens: critical|high|medium|low|p1|p2|p3|p4
 * - Quoted text: title (e.g., 'Fix login bug')
 * - Unquoted text with dashes: slug (optional)
 *
 * @param tokens - Array of token strings
 * @returns Parsed type, priority, title, and slug
 */
export function parseCreateTokens(tokens: string[]): ParsedTokens {
  let type: string = DEFAULT_TYPE
  let priority: string = DEFAULT_PRIORITY
  let title: string | null = null
  let slug: string | null = null

  for (const token of tokens) {
    const lowerToken = token.toLowerCase()

    // Check for combined type/priority token (e.g. "feature/p2", "bug/high")
    if (lowerToken.includes('/') && !token.startsWith('"') && !token.startsWith('\'')) {
      const parts = lowerToken.split('/')
      let matchedPart = false
      for (const part of parts) {
        if (part in TYPE_TOKENS) {
          type = TYPE_TOKENS[part]
          matchedPart = true
        }
        else if (part in PRIORITY_TOKENS) {
          priority = PRIORITY_TOKENS[part]
          matchedPart = true
        }
      }
      if (matchedPart)
        continue
    }

    // Check for type token
    if (lowerToken in TYPE_TOKENS) {
      type = TYPE_TOKENS[lowerToken]
      continue
    }

    // Check for priority token
    if (lowerToken in PRIORITY_TOKENS) {
      priority = PRIORITY_TOKENS[lowerToken]
      continue
    }

    // Check for quoted title (single or double quotes)
    if ((token.startsWith('\'') && token.endsWith('\''))
      || (token.startsWith('"') && token.endsWith('"'))) {
      title = token.slice(1, -1) // Remove quotes
      continue
    }

    // Token with spaces is a title (e.g. unquoted multi-word passed by shell)
    if (token.includes(' ')) {
      title = token
      continue
    }

    // Dashed token without spaces
    if (token.includes('-') && !token.includes(' ')) {
      if (title) {
        // After title is set → explicit slug
        slug = token
      }
      else {
        // No title yet → use as both title and slug
        title = token
        slug = token
      }
      continue
    }

    // Otherwise, treat as title if we don't have one yet
    if (!title) {
      title = token
    }
  }

  // Derive human-readable title from slug-style title if title is slug-only
  // e.g. 'fix-database-pool' → 'Fix Database Pool'
  if (title && !title.includes(' ') && title.includes('-')) {
    title = title
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // If no title but slug provided, derive title from slug
  if (!title && slug) {
    title = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // If still no title, that's an error
  if (!title) {
    throw new Error('Usage: mdt-cli create <type>[/<priority>] \'<title>\' [slug]\n'
      + 'Example: mdt-cli create bug "Fix login timeout"')
  }

  return { type, priority, title, slug }
}

/**
 * Ticket create action handler
 *
 * @param tokens - Array of positional tokens (type, priority, title, slug)
 * @param options - Commander options object
 * @throws Process.exit(1) on error
 */
export async function ticketCreateAction(
  tokens: string[],
  options: CreateCommandOptions,
): Promise<void> {
  // Parse tokens to extract type, priority, title, slug
  const { type, priority, title, slug } = parseCreateTokens(tokens)

  // Check for stdin content
  let content: string | undefined
  if (options.stdin || !process.stdin.isTTY) {
    const stdinContent = await readStdin()
    if (stdinContent) {
      content = stdinContent
    }
  }

  // Resolve project: explicit --project wins, otherwise cwd detection
  const projectService = new ProjectService(true) // quiet=true
  let project: Project
  if (options.project) {
    const resolved = await projectService.getProjectByCodeOrId(options.project)
    if (!resolved) {
      throw new CliCommandError('PROJECT_NOT_FOUND', `Project ${options.project} not found`, { projectCode: options.project })
    }
    project = resolved
  }
  else {
    const result = await projectService.resolveCurrentProject()
    if (!result.data) {
      throw new Error('No project context found. Run from a project directory.')
    }
    project = result.data
  }

  // Build ticket data
  const ticketData: TicketData = {
    title,
    type,
    priority,
    content,
    ...(slug && { slug }),
  }

  // Create the ticket via TicketService
  const ticketService = new TicketService(true)
  const ticket = await ticketService.createCR(project, type, ticketData)

  const outputFormat = getOutputFormat(options)
  if (outputFormat !== 'human') {
    writeStructuredSuccess(
      outputFormat,
      'ticket.create',
      {
        ticket: formatTicketForStructured(ticket, project.project.path),
        created: true,
      },
      {
        projectCode: project.project.code,
        projectId: project.id,
      },
    )
    return
  }

  // Print success message
  const projectPath = project.project.path
  console.log(formatTicketCreate(ticket.code, ticket.filePath, projectPath))
}
