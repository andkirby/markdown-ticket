/**
 * CLI Ticket Delete Command (MDT-143)
 *
 * Deletes a ticket file with interactive confirmation on TTY.
 * Uses --force or non-TTY stdin to skip confirmation.
 * Cleans up empty CR directories after file removal.
 */

import type { Project } from '@mdt/shared/models/Project.js'
import { TICKET_KEY_INPUT_PATTERN } from '@mdt/domain-contracts'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'

/**
 * Resolve current project context
 */
async function resolveCurrentProject(): Promise<Project> {
  const projectService = new ProjectService(true)
  const result = await projectService.resolveCurrentProject()

  if (!result.data) {
    throw new Error('No project context found. Run from a project directory.')
  }

  return result.data
}

/**
 * Prompt user for confirmation on TTY
 *
 * @returns true if user confirmed, false otherwise
 */
function confirmDelete(key: string, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(`Delete ${key} (${title})? [y/N] `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Clean up empty CR directory if the ticket file was the last entry
 *
 * @param filePath - The deleted ticket file path
 */
async function cleanupEmptyCRDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  // Check if the directory name matches a CR key pattern (e.g., MDT-007)
  const dirName = path.basename(dir)
  if (!TICKET_KEY_INPUT_PATTERN.test(dirName)) {
    return
  }

  try {
    const entries = await readdir(dir)
    if (entries.length === 0) {
      await rm(dir, { recursive: true })
    }
  }
  catch {
    // Directory may not exist or may not be readable — ignore
  }
}

/**
 * Ticket delete action handler
 *
 * @param key - Ticket key to delete
 * @param options - Commander options
 * @param options.force - Skip confirmation prompt
 */
export async function ticketDeleteAction(
  key: string,
  options: { force?: boolean },
): Promise<void> {
  const project = await resolveCurrentProject()
  const ticketService = new TicketService(true)

  // Resolve the ticket to get its title and path
  const ticket = await ticketService.getCR(project, key)
  if (!ticket) {
    throw new Error(`Ticket ${key} not found`)
  }

  // Determine if confirmation is needed
  const needsConfirm = process.stdin.isTTY && !options.force

  if (needsConfirm) {
    const confirmed = await confirmDelete(key, ticket.title)
    if (!confirmed) {
      console.log('Cancelled')
      return
    }
  }

  // Delete via shared service
  const deleted = await ticketService.deleteCR(project, key)
  if (!deleted) {
    throw new Error(`Ticket ${key} not found`)
  }

  // Clean up empty CR directory
  await cleanupEmptyCRDir(ticket.filePath)

  // Print relative path
  const projectPath = project.project.path
  const relativePath = path.relative(projectPath, ticket.filePath)
  console.log(`Deleted ${key} ${relativePath}`)
}
