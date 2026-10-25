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
import { CRPriorities, CRTypes } from '@mdt/domain-contracts/types'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatTicketCreate } from '../output/formatter.js'
import { CliCommandError, formatTicketForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'
import { DEFAULT_PRIORITY, DEFAULT_TYPE, PRIORITY_TOKENS, TYPE_TOKENS } from '../utils/aliases.js'
import { readStdin } from '../utils/stdin.js'

/**
 * Build the strict-token rejection error for an unknown explicit create
 * type/priority token (MDT-263). Mirrors the attr/shared-resolver envelope:
 * human message carries the valid sets, details carry them for --json/--yaml.
 */
function unknownCreateTokenError(token: string, part?: string): CliCommandError {
  // Aliases = token map keys that are not canonical self-mappings.
  const aliasList = (map: Record<string, string>): string =>
    Object.keys(map).filter(key => map[key] !== undefined && map[key].toLowerCase() !== key).join(', ')
  const partSuffix = part ? ` (part '${part}')` : ''
  return new CliCommandError(
    'INVALID_CREATE_TOKEN',
    `Unknown create token '${token}'${partSuffix}. `
    + `Valid types: ${CRTypes.join(', ')} (aliases: ${aliasList(TYPE_TOKENS)}). `
    + `Valid priorities: ${CRPriorities.join(', ')} (aliases: ${aliasList(PRIORITY_TOKENS)}).`,
    {
      hint: 'Use one of the listed type/priority tokens. A single-word token containing / is always parsed as type/priority — slash-containing titles must be multi-word (e.g. "24/7 service").',
      validTypes: CRTypes,
      validPriorities: CRPriorities,
    },
  )
}

/**
 * True when the token is an explicitly quoted title (quote characters retained
 * when tests invoke the parser directly; a real shell strips them, which is
 * why bare-word handling below cannot rely on quotes alone).
 */
function isQuotedTitle(token: string): boolean {
  return (token.startsWith('\'') && token.endsWith('\''))
    || (token.startsWith('"') && token.endsWith('"'))
}

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
 * - Type tokens: bug|feature|architecture|debt|tech-debt|techdebt|docs|documentation|research (+ canonical values)
 * - Priority tokens: critical|high|medium|low|p1|p2|p3|p4 (+ canonical values)
 * - Quoted text: title (e.g., 'Fix login bug')
 * - Unquoted text with dashes: slug (optional)
 * - Unknown explicit type/priority tokens are rejected (MDT-263): every part of
 *   a slash-combined token and every standalone single-word dash-less token
 *   must be a known enum value unless it is serving as the title (no quoted or
 *   multi-word title token present).
 *
 * @param tokens - Array of token strings
 * @returns Parsed type, priority, title, and slug
 */
export function parseCreateTokens(tokens: string[]): ParsedTokens {
  let type: string = DEFAULT_TYPE
  let priority: string = DEFAULT_PRIORITY
  let title: string | null = null
  let slug: string | null = null

  // Own-property lookups only: inherited names like `constructor` or
  // `__proto__` must not resolve as enum tokens (MDT-263 review).
  const isEnumToken = (token: string): boolean =>
    Object.hasOwn(TYPE_TOKENS, token.toLowerCase()) || Object.hasOwn(PRIORITY_TOKENS, token.toLowerCase())

  // An explicit title is a quoted or multi-word token that is not itself an
  // enum value (canonical multi-word values like "Feature Enhancement" are
  // enums, not titles). Its presence makes every unknown bare word an
  // enum-position token regardless of order.
  const hasExplicitTitle = tokens.some(token =>
    (isQuotedTitle(token) || token.includes(' ')) && !isEnumToken(token))

  for (const token of tokens) {
    const lowerToken = token.toLowerCase()

    // Check for combined type/priority token (e.g. "feature/p2", "bug/high").
    // Single-word tokens only: a slash inside a multi-word token is title
    // text (e.g. "Fix input/output"), not `<type>[/<priority>]` grammar.
    if (lowerToken.includes('/') && !token.includes(' ') && !isQuotedTitle(token)) {
      const parts = lowerToken.split('/')
      const unknownPart = parts.find(part => !isEnumToken(part))
      if (unknownPart !== undefined)
        throw unknownCreateTokenError(token, unknownPart)
      for (const part of parts) {
        if (Object.hasOwn(TYPE_TOKENS, part))
          type = TYPE_TOKENS[part]
        else
          priority = PRIORITY_TOKENS[part]
      }
      continue
    }

    // Check for type token
    if (Object.hasOwn(TYPE_TOKENS, lowerToken)) {
      type = TYPE_TOKENS[lowerToken]
      continue
    }

    // Check for priority token
    if (Object.hasOwn(PRIORITY_TOKENS, lowerToken)) {
      priority = PRIORITY_TOKENS[lowerToken]
      continue
    }

    // Check for quoted title (single or double quotes)
    if (isQuotedTitle(token)) {
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

    // Otherwise: once any title is determined — explicit (quoted/multi-word)
    // or derived (an earlier bare word) — an unknown dash-less single word can
    // only be a misspelled type/priority token or junk. Reject it instead of
    // silently swallowing or double-titling (MDT-263). As the only title-ish
    // material it stays the documented single-word title derivation.
    if (hasExplicitTitle || title) {
      throw unknownCreateTokenError(token)
    }
    title = token
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
