import process from 'node:process'
/**
 * CLI Entry Point (MDT-143)
 *
 * Bootstrap commander command tree with shortcut normalization.
 * This is the single owner of CLI command registration and help output.
 */

import { Command } from 'commander'
import { generateGuide } from './output/guide.js'
import { normalizeShortcuts } from './utils/args.js'

/**
 * Main CLI entry point
 */
export function main(): void {
  // Apply shortcut normalization before commander parses argv
  const normalizedArgs = normalizeShortcuts(process.argv)
  process.argv = normalizedArgs

  // Check for --guide before commander parse (works at global scope)
  if (process.argv.includes('--guide')) {
    const program = new Command()
    program
      .name('mdt-cli')
      .description('CLI tool for Markdown Ticket management')
      .version('1.0.0')
    // Register full command tree first so guide can reflect it
    registerCommands(program)
    // Check scope
    const guideIndex = process.argv.indexOf('--guide')
    const scopeIndex = guideIndex - 1
    const scope = scopeIndex >= 2 ? process.argv[scopeIndex] : undefined
    if (scope === 'ticket' || scope === 'project') {
      const subCmd = program.commands.find(c => c.name() === scope)
      if (subCmd) {
        console.log(generateGuide(subCmd, scope))
        return
      }
    }
    console.log(generateGuide(program))
    return
  }

  // Create commander program
  const program = new Command()

  program
    .name('mdt-cli')
    .description('CLI tool for Markdown Ticket management')
    .version('1.0.0')

  registerCommands(program)

  program.parse()
}

/**
 * Register all commands on the program
 */
function registerCommands(program: Command): void {
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
    .alias('ls')
    .description('List tickets')
    .argument('[filters...]', 'Filter arguments (e.g., status=impl priority=high)')
    .option('-j, --json', 'Output as JSON')
    .option('-a, --all', 'Show all tickets (no limit)')
    .option('-l, --limit <n>', 'Limit number of results', Number.parseInt)
    .option('-o, --offset <n>', 'Skip first N results', Number.parseInt)
    .option('--files', 'Show file paths only')
    .option('--info', 'Show info without file paths')
    .action(async (filters, options) => {
      const { ticketListAction } = await import('./commands/list.js')
      try {
        await ticketListAction(filters, options)
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
    .option('-p, --project <code>', 'Target project code')
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

  // ticket delete
  ticketCmd
    .command('delete')
    .description('Delete a ticket')
    .argument('<key>', 'Ticket key')
    .option('--force', 'Skip confirmation prompt')
    .action(async (key, options) => {
      const { ticketDeleteAction } = await import('./commands/delete.js')
      try {
        await ticketDeleteAction(key, options)
      }
      catch (error) {
        console.error(`Error: ${(error as Error).message}`)
        process.exit(1)
      }
    })

  // ticket rename
  ticketCmd
    .command('rename')
    .description('Rename a ticket (title and optional slug)')
    .argument('<key>', 'Ticket key')
    .argument('<tokens...>', 'New title (quoted) and optional slug')
    .action(async (key, tokens) => {
      const { ticketRenameAction } = await import('./commands/rename.js')
      try {
        await ticketRenameAction(key, tokens)
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
    .option('-t, --tickets-path <path>', 'Tickets directory (relative to project root)')
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
  // End of command registration
  // ====================================================================
}

// Run main when executed directly
main()
