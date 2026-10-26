/** Offline presentation adapter for staged ticket validation (MDT-261). */
import type { StructuredOutputOptions } from '../output/structured.js'
import process from 'node:process'
import { validateStagedTickets } from '@mdt/shared/services/ticket/staged-validation.js'
import { formatTicketValidation } from '../output/formatter.js'
import { CliCommandError, getOutputFormat, writeStructuredError, writeStructuredSuccess } from '../output/structured.js'

interface ValidateCommandOptions extends StructuredOutputOptions {
  staged?: boolean
}

export async function ticketValidateAction(options: ValidateCommandOptions): Promise<void> {
  if (!options.staged)
    throw new CliCommandError('VALIDATION_MODE_REQUIRED', 'Specify --staged to validate the proposed Git commit.')
  const result = await validateStagedTickets({ repoRoot: process.cwd() })
  const format = getOutputFormat(options)
  if (result.diagnostics.length > 0) {
    if (format === 'human')
      console.error(formatTicketValidation(result))
    else
      writeStructuredError(format, 'ticket.validate', new CliCommandError('TICKET_VALIDATION_FAILED', 'Staged tickets contain unfinished content. Replace the reported instructions before committing.', { checked: result.checked }), result.diagnostics)
    process.exitCode = 1
    return
  }
  if (format === 'human')
    console.log(formatTicketValidation(result))
  else
    writeStructuredSuccess(format, 'ticket.validate', { applicable: result.applicable, checked: result.checked }, {}, result.diagnostics)
}
