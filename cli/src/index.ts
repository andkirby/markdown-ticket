import process from 'node:process'
/**
 * CLI Entry Point (MDT-143)
 *
 * Bootstrap commander command tree with shortcut normalization.
 * This is the single owner of CLI command registration and help output.
 */

import { Command } from 'commander'
import { normalizeShortcuts } from './utils/args.js'

/**
 * Main CLI entry point
 */
export function main(): void {
  // Apply shortcut normalization before commander parses argv
  const normalizedArgs = normalizeShortcuts(process.argv)
  process.argv = normalizedArgs

  // Create commander program
  const program = new Command()

  program
    .name('mdt-cli')
    .description('CLI tool for Markdown Ticket management')
    .version('1.0.0')

  // ====================================================================
  // TICKET NAMESPACE
  // ====================================================================

  const ticketCmd = program
    .command('ticket')
    .description('Ticket/CR operations')

  // ticket get
  ticketCmd
    .command('get')
    .description('Get ticket details')
    .argument('<key>', 'Ticket key (e.g., 5, ABC-12, PROJ/MDT-12)')
    .action(async (key) => {
      const { ticketViewAction } = await import('./commands/view.js')
      try {
        await ticketViewAction(key)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // ticket list
  ticketCmd
    .command('list')
    .description('List tickets')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      const { ticketListAction } = await import('./commands/list.js')
      try {
        await ticketListAction(options)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // ticket create
  ticketCmd
    .command('create')
    .description('Create a new ticket')
    .argument('[tokens...]', 'Type[/priority], title, and optional slug')
    .option('--stdin', 'Read ticket content from stdin')
    .action(async (tokens, options) => {
      const { ticketCreateAction } = await import('./commands/create.js')
      try {
        await ticketCreateAction(tokens, options)
      }
      catch (error) {
        console.error(`Error: ${(error as Error).message}`)
        process.exit(1)
      }
    })

  // ticket attr
  ticketCmd
    .command('attr')
    .description('Update ticket attributes')
    .argument('<key>', 'Ticket key')
    .argument('<attrs...>', 'Attributes to update (e.g., status=Implemented)')
    .action(async (key, attrs) => {
      const { ticketAttrAction } = await import('./commands/attr.js')
      try {
        await ticketAttrAction(key, attrs)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // ====================================================================
  // PROJECT NAMESPACE
  // ====================================================================

  const projectCmd = program
    .command('project')
    .description('Project operations')

  // project current
  projectCmd
    .command('current')
    .description('Show current project')
    .action(async () => {
      const { projectCurrentAction } = await import('./commands/project.js')
      try {
        await projectCurrentAction()
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // project get
  projectCmd
    .command('get')
    .description('Get project details')
    .argument('<code>', 'Project code')
    .action(async (code) => {
      const { projectGetAction } = await import('./commands/project.js')
      try {
        await projectGetAction(code)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // project info (alias for get)
  projectCmd
    .command('info')
    .description('Show project information (alias for get)')
    .argument('<code>', 'Project code')
    .action(async (code) => {
      const { projectGetAction } = await import('./commands/project.js')
      try {
        await projectGetAction(code)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // project ls / list
  projectCmd
    .command('ls')
    .alias('list')
    .description('List all projects')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      const { projectListAction } = await import('./commands/project.js')
      try {
        await projectListAction(options)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // project init
  projectCmd
    .command('init')
    .description('Initialize a new project')
    .argument('<code>', 'Project code')
    .argument('<name>', 'Project name')
    .option('-d, --dir <path>', 'Project directory')
    .action(async (code, name, options) => {
      const { projectInitAction } = await import('./commands/project.js')
      try {
        await projectInitAction(code, name, options)
      }
      catch (error) {
        console.error(error)
        process.exit(1)
      }
    })

  // ====================================================================
  // PARSE AND EXECUTE
  // ====================================================================

  program.parse()
}

// Run main when executed directly
main()
