import process from 'node:process'
/**
 * CLI Entry Point (MDT-143)
 *
 * Bootstrap commander command tree with shortcut normalization.
 * This is the single owner of CLI command registration and help output.
 */

import { Command } from 'commander'
import { generateGuide } from './output/guide.js'
import { assertSingleOutputFormat, getRequestedOutputFormat, writeStructuredError } from './output/structured.js'
import { normalizeShortcuts } from './utils/args.js'

interface CliActionOptions extends Record<string, unknown> {
  json?: boolean
  yaml?: boolean
}

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
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')

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
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (key, options) => {
      const { ticketViewAction } = await import('./commands/view.js')
      await runCliAction(program, 'ticket.get', options, mergedOptions => ticketViewAction(key, mergedOptions))
    })

  // ticket list
  ticketCmd
    .command('list')
    .alias('ls')
    .description('List tickets')
    .argument('[filters...]', 'Filter arguments (e.g., status=impl priority=high)')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('-a, --all', 'Show all tickets (no limit)')
    .option('-l, --limit <n>', 'Limit number of results', Number.parseInt)
    .option('-o, --offset <n>', 'Skip first N results', Number.parseInt)
    .option('--files', 'Show file paths only')
    .option('--info', 'Show info without file paths')
    .option('-p, --project <code>', 'Target project code')
    .action(async (filters, options) => {
      const { ticketListAction } = await import('./commands/list.js')
      await runCliAction(program, 'ticket.list', options, mergedOptions => ticketListAction(filters, mergedOptions))
    })

  // ticket create
  ticketCmd
    .command('create')
    .description('Create a new ticket')
    .argument('[tokens...]', 'Type[/priority], title, and optional slug')
    .option('--stdin', 'Read ticket content from stdin')
    .option('-p, --project <code>', 'Target project code')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (tokens, options) => {
      const { ticketCreateAction } = await import('./commands/create.js')
      await runCliAction(program, 'ticket.create', options, mergedOptions => ticketCreateAction(tokens, mergedOptions))
    })

  // ticket attr
  ticketCmd
    .command('attr')
    .description('Update ticket attributes')
    .argument('<key>', 'Ticket key')
    .argument('<attrs...>', 'Attributes to update (e.g., status=Implemented)')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (key, attrs, options) => {
      const { ticketAttrAction } = await import('./commands/attr.js')
      await runCliAction(program, 'ticket.attr', options, mergedOptions => ticketAttrAction(key, attrs, mergedOptions))
    })

  // ticket delete
  ticketCmd
    .command('delete')
    .description('Delete a ticket')
    .argument('<key>', 'Ticket key')
    .option('--force', 'Skip confirmation prompt')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (key, options) => {
      const { ticketDeleteAction } = await import('./commands/delete.js')
      await runCliAction(program, 'ticket.delete', options, mergedOptions => ticketDeleteAction(key, mergedOptions))
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
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (options) => {
      const { projectCurrentAction } = await import('./commands/project.js')
      await runCliAction(program, 'project.current', options, mergedOptions => projectCurrentAction(mergedOptions))
    })

  // project get
  projectCmd
    .command('get')
    .description('Get project details')
    .argument('<code>', 'Project code')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (code, options) => {
      const { projectGetAction } = await import('./commands/project.js')
      await runCliAction(program, 'project.get', options, mergedOptions => projectGetAction(code, mergedOptions))
    })

  // project info (alias for get)
  projectCmd
    .command('info')
    .description('Show project information (alias for get)')
    .argument('<code>', 'Project code')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (code, options) => {
      const { projectGetAction } = await import('./commands/project.js')
      await runCliAction(program, 'project.get', options, mergedOptions => projectGetAction(code, mergedOptions))
    })

  // project ls / list
  projectCmd
    .command('ls')
    .alias('list')
    .description('List all projects')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (options) => {
      const { projectListAction } = await import('./commands/project.js')
      await runCliAction(program, 'project.list', options, mergedOptions => projectListAction(mergedOptions))
    })

  // project init
  projectCmd
    .command('init')
    .description('Initialize a new project')
    .argument('<code>', 'Project code')
    .argument('<name>', 'Project name')
    .option('-d, --dir <path>', 'Project directory')
    .option('-t, --tickets-path <path>', 'Tickets directory (relative to project root)')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (code, name, options) => {
      const { projectInitAction } = await import('./commands/project.js')
      await runCliAction(program, 'project.init', options, mergedOptions => projectInitAction(code, name, mergedOptions))
    })

  // ====================================================================
  // End of command registration
  // ====================================================================
}

async function runCliAction(
  program: Command,
  commandName: string,
  options: Record<string, unknown>,
  action: (options: CliActionOptions) => Promise<void>,
): Promise<void> {
  const mergedOptions = { ...program.opts(), ...options } as CliActionOptions
  const requestedFormat = getRequestedOutputFormat(mergedOptions)

  try {
    assertSingleOutputFormat(mergedOptions)
    await action(mergedOptions)
  }
  catch (error) {
    if (requestedFormat) {
      writeStructuredError(requestedFormat, commandName, error)
    }
    else {
      console.error(formatHumanError(error))
    }
    process.exit(1)
  }
}

function formatHumanError(error: unknown): string {
  if (error instanceof Error)
    return `Error: ${error.message}`
  return String(error)
}

// Run main when executed directly
main()
