/**
 * CLI Ticket List Command (MDT-143)
 *
 * Implements ticket list command using shared services.
 * Resolves project context and displays all tickets in compact format.
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import type { Project } from '@mdt/shared/models/Project.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { formatTicketList as formatTicketListFormatter } from '../output/formatter.js'

/**
 * Format ticket list as JSON
 */
function formatTicketListJSON(tickets: Ticket[]): string {
  return JSON.stringify(tickets, null, 2)
}

/**
 * Ticket list action handler
 *
 * @param options - Command options (json: boolean for JSON output)
 * @throws Process.exit(1) on error
 */
export async function ticketListAction(options: { json?: boolean }): Promise<void> {
  const projectService = new ProjectService(true) // quiet=true
  const ticketService = new TicketService(true)

  // Resolve current project
  const projectResult = await projectService.resolveCurrentProject()

  if (!projectResult.data) {
    console.error('Error: No project context. Run from a project directory.')
    process.exit(1)
  }

  const projectCode = projectResult.data.project.code
  const projectPath = projectResult.data.project.path

  // List tickets
  const result = await ticketService.listTickets({
    projectRef: projectCode,
  })

  // Format output
  if (options.json) {
    console.log(formatTicketListJSON(result.data))
  }
  else {
    console.log(formatTicketListFormatter(result.data, projectCode, projectPath))
  }
}
