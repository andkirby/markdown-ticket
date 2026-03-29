/**
 * CLI Ticket Create Command (MDT-143)
 *
 * Implements ticket create command with order-independent token parsing.
 * Supports type/priority tokens, quoted titles, and optional slug.
 * Reads content from stdin when piped.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import type { TicketData } from '@mdt/shared/models/Ticket.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { readStdin } from '../utils/stdin.js'
import { formatTicketCreate } from '../output/formatter.js'

/**
 * CR type token mapping (case-insensitive)
 */
const TYPE_TOKENS: Record<string, string> = {
  'bug': 'Bug Fix',
  'feature': 'Feature Enhancement',
  'architecture': 'Architecture',
  'tech-debt': 'Technical Debt',
  'techdebt': 'Technical Debt',
  'documentation': 'Documentation',
  'docs': 'Documentation',
  'research': 'Research',
}

/**
 * Priority token mapping (case-insensitive)
 */
const PRIORITY_TOKENS: Record<string, string> = {
  'critical': 'Critical',
  'p1': 'Critical',
  'high': 'High',
  'p2': 'High',
  'medium': 'Medium',
  'p3': 'Medium',
  'low': 'Low',
  'p4': 'Low',
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
function parseCreateTokens(tokens: string[]): ParsedTokens {
  let type = 'Feature Enhancement' // Default
  let priority = 'Medium' // Default
  let title: string | null = null
  let slug: string | null = null

  for (const token of tokens) {
    const lowerToken = token.toLowerCase()

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
    if ((token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('"') && token.endsWith('"'))) {
      title = token.slice(1, -1) // Remove quotes
      continue
    }

    // Unquoted token with dashes - treat as slug if no title yet
    if (token.includes('-') && !title) {
      slug = token
      continue
    }

    // Otherwise, treat as title if we don't have one yet
    if (!title) {
      title = token
    }
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
 * Resolve current project context
 *
 * @returns Current project
 * @throws Error if no project context found
 */
async function resolveCurrentProject(): Promise<Project> {
  const projectService = new ProjectService(true) // quiet=true
  const result = await projectService.resolveCurrentProject()

  if (!result.data) {
    throw new Error('No project context found. Run from a project directory.')
  }

  return result.data
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
  options: { stdin?: boolean },
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

  // Resolve current project
  const project = await resolveCurrentProject()

  // Build ticket data
  const ticketData: TicketData = {
    title,
    type,
    priority,
    content,
  }

  // Create the ticket via TicketService
  const ticketService = new TicketService(true)
  const ticket = await ticketService.createCR(project, type, ticketData)

  // Print success message
  const projectPath = project.project.path
  console.log(formatTicketCreate(ticket.code, ticket.filePath, projectPath))
}
