import type { CRStatus } from '@mdt/shared/models/Types.js'
import type { AttrOperation } from '@mdt/shared/services/ticket/types.js'
/**
 * CLI Ticket Attr Command (MDT-143)
 *
 * Implements ticket attribute update command using shared services.
 * Parses CLI attr tokens into shared AttrOperation requests and invokes shared ticket attr updates.
 */

import type { AttrUpdateResult } from '../output/formatter.js'
import type { StructuredOutputOptions } from '../output/structured.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ServiceError } from '@mdt/shared/services/ServiceError.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { KeyNormalizationError, normalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { formatTicketAttrPipe } from '../output/formatter.js'
import { CliCommandError, formatAttrChangesForStructured, getOutputFormat, writeStructuredSuccess } from '../output/structured.js'
import { PRIORITY_TOKENS, STATUS_ALIASES } from '../utils/aliases.js'

/**
 * Field mapping: CLI key → shared field name
 */
const FIELD_MAPPING: Record<string, string> = {
  'status': 'status',
  'priority': 'priority',
  'phase': 'phaseEpic',
  'assignee': 'assignee',
  'related': 'relatedTickets',
  'depends': 'dependsOn',
  'blocks': 'blocks',
  'impl-date': 'implementationDate',
  'impl-notes': 'implementationNotes',
}

/**
 * Reverse field mapping for error messages
 */
/**
 * Scalar fields (only support = operator)
 */
const _SCALAR_FIELDS = new Set([
  'status',
  'priority',
  'phaseEpic',
  'assignee',
  'implementationDate',
  'implementationNotes',
])

/**
 * Parse ticket key to extract project code and ticket key
 * (Reused from view.ts)
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
    const [, projectCode, _number] = fullFormatMatch
    return {
      projectCode: projectCode.toUpperCase(),
      ticketKey: key,
    }
  }

  // Numeric or other shorthand - return null to use current project
  return null
}

/**
 * Parse a single attr token into an AttrOperation
 *
 * Examples:
 * - "status=Implemented" → { field: "status", op: "replace", value: "Implemented" }
 * - "related+=ABC-003" → { field: "relatedTickets", op: "add", value: ["ABC-003"] }
 * - "depends-=MDT-001" → { field: "dependsOn", op: "remove", value: ["MDT-001"] }
 */
function parseAttrToken(token: string): AttrOperation {
  // Detect operator: +=, -=, or =
  let operator: string
  let fieldPart: string
  let valuePart: string

  if (token.includes('+=')) {
    operator = '+='
    const parts = token.split('+=')
    fieldPart = parts[0]!
    valuePart = parts.slice(1).join('+=') // Handle edge case where value might contain +=
  }
  else if (token.includes('-=')) {
    operator = '-='
    const parts = token.split('-=')
    fieldPart = parts[0]!
    valuePart = parts.slice(1).join('-=') // Handle edge case where value might contain -=
  }
  else if (token.includes('=')) {
    operator = '='
    const parts = token.split('=')
    fieldPart = parts[0]!
    valuePart = parts.slice(1).join('=') // Handle edge case where value might contain =
  }
  else {
    throw new Error(`Invalid attribute token '${token}'. Expected format: <field>=<value>, <field>+=<value>, or <field>-=<value>`)
  }

  if (!fieldPart) {
    throw new Error(`Missing field name in token '${token}'`)
  }

  if (!valuePart) {
    throw new Error(`Missing value in token '${token}'`)
  }

  // Map CLI field name to shared field name
  const cliFieldName = fieldPart.toLowerCase()

  const sharedField = FIELD_MAPPING[cliFieldName]

  if (!sharedField) {
    const supportedFields = Object.keys(FIELD_MAPPING).join(', ')
    throw new Error(`Unknown attribute '${fieldPart}'. Supported: ${supportedFields}`)
  }

  // Normalize value based on field type
  const normalizedValue = normalizeFieldValue(sharedField, valuePart)

  // Determine operation
  let op: AttrOperation['op']
  if (operator === '=') {
    op = 'replace'
  }
  else if (operator === '+=') {
    op = 'add'
  }
  else if (operator === '-=') {
    op = 'remove'
  }
  else {
    throw new Error(`Invalid operator '${operator}'`)
  }

  return {
    field: sharedField,
    op,
    value: normalizedValue,
  }
}

/**
 * Normalize field value based on field type
 */
function normalizeFieldValue(field: string, value: string): string | string[] {
  // Handle quoted values (remove surrounding quotes)
  const trimmedValue = value.trim()
  if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
    || (trimmedValue.startsWith('\'') && trimmedValue.endsWith('\''))) {
    return trimmedValue.slice(1, -1)
  }

  // Status normalization
  if (field === 'status') {
    const normalizedKey = trimmedValue.toLowerCase().replace(/\s+/g, '_')
    return STATUS_ALIASES[normalizedKey] || trimmedValue
  }

  // Priority normalization
  if (field === 'priority') {
    const normalizedKey = trimmedValue.toLowerCase()
    return PRIORITY_TOKENS[normalizedKey] || trimmedValue
  }

  // Relation fields: split on commas for list operations
  if (field === 'relatedTickets' || field === 'dependsOn' || field === 'blocks') {
    return trimmedValue.split(',').map(v => v.trim()).filter(Boolean)
  }

  return trimmedValue
}

/**
 * Ticket attr action handler
 *
 * @param key - Ticket key (numeric shorthand, full format, or cross-project)
 * @param attrTokens - Array of attribute tokens to update
 * @throws Process.exit(1) on error
 */
export async function ticketAttrAction(
  key: string,
  attrTokens: string[],
  options: StructuredOutputOptions = {},
): Promise<void> {
  if (!attrTokens || attrTokens.length === 0) {
    throw new CliCommandError(
      'MISSING_ATTRIBUTES',
      'No attributes specified. Usage: mdt-cli ticket attr <ticket> <field>=<value> ...',
    )
  }

  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)

  let projectCode: string
  let ticketKey: string

  // Try to parse the key
  const parsed = parseTicketKey(key)

  if (parsed) {
    // Cross-project or full format - use explicit project code
    projectCode = parsed.projectCode
    ticketKey = parsed.ticketKey
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
  if (parsed && !ticketKey.includes('/')) {
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

  // Parse all attr tokens into operations
  const operations: AttrOperation[] = []

  for (const token of attrTokens) {
    try {
      const operation = parseAttrToken(token)
      operations.push(operation)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new CliCommandError('INVALID_ATTRIBUTE_TOKEN', message)
    }
  }

  // Separate status operations from regular attr operations
  const statusOps = operations.filter(op => op.field === 'status')
  const regularOps = operations.filter(op => op.field !== 'status')

  try {
    // Resolve project object
    const project = await projectService.getProjectByCodeOrId(projectCode)
    if (!project) {
      throw new CliCommandError('PROJECT_NOT_FOUND', `Project ${projectCode} not found`, { projectCode })
    }

    // Get current ticket to capture old values for pipe format
    let currentTicket: import('@mdt/shared/models/Ticket.js').Ticket | null = null
    try {
      const ticketResult = await ticketService.getTicket({
        projectRef: projectCode,
        ticketKey,
      })
      currentTicket = ticketResult.data
    }
    catch {
      // Ticket might not exist yet for status-only updates on new tickets
    }

    const results: AttrUpdateResult[] = []

    // Helper to get current field value from ticket
    const getFieldValue = (field: string): string => {
      if (!currentTicket)
        return '(none)'
      const ticket = currentTicket as unknown as Record<string, unknown>
      const val = ticket[field]
      if (val == null)
        return '(none)'
      if (Array.isArray(val))
        return val.join(', ')
      return String(val)
    }

    // Handle status updates through updateCRStatus
    for (const statusOp of statusOps) {
      if (statusOp.op !== 'replace') {
        throw new CliCommandError('INVALID_ATTRIBUTE_OPERATOR', 'status only supports = operator')
      }
      const statusValue = typeof statusOp.value === 'string' ? statusOp.value : String(statusOp.value)
      const oldValue = getFieldValue('status')

      await ticketService.updateCRStatus(project, ticketKey, statusValue as CRStatus)

      results.push({
        field: 'status',
        op: 'replace',
        oldValue,
        newValue: statusValue,
      })
    }

    // Handle regular attr updates through updateTicketAttributes
    let resultTicketCode = ticketKey
    if (regularOps.length > 0) {
      const result = await ticketService.updateTicketAttributes({
        projectRef: projectCode,
        ticketKey,
        operations: regularOps,
      })
      resultTicketCode = result.ticket.code

      // Build results with old/new values
      for (const op of regularOps) {
        const oldValue = getFieldValue(op.field)
        const newValue = Array.isArray(op.value) ? op.value.join(', ') : String(op.value)
        results.push({
          field: op.field,
          op: op.op,
          oldValue,
          newValue,
        })
      }
    }

    const outputFormat = getOutputFormat(options)
    if (outputFormat !== 'human') {
      writeStructuredSuccess(
        outputFormat,
        'ticket.attr',
        {
          ticket: {
            key: resultTicketCode,
          },
          changes: formatAttrChangesForStructured(results),
        },
        {
          projectCode,
          projectId: project.id,
        },
      )
      return
    }

    // Print pipe-separated confirmation
    console.log(formatTicketAttrPipe(resultTicketCode, results))
  }
  catch (error) {
    if (error instanceof CliCommandError) {
      throw error
    }

    if (error instanceof ServiceError) {
      if (error.code === 'TICKET_NOT_FOUND') {
        throw error
      }
      if (error.code === 'INVALID_OPERATION') {
        throw error
      }
    }

    // Generic error
    const message = error instanceof Error ? error.message : String(error)
    throw new CliCommandError('ATTR_UPDATE_FAILED', `Failed to update ticket attributes: ${message}`)
  }
}
