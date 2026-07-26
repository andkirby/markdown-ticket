import process from 'node:process'
/**
 * CLI Entry Point (MDT-143)
 *
 * Bootstrap commander command tree with shortcut normalization.
 * This is the single owner of CLI command registration and help output.
 */

import { Command, Option } from 'commander'
import { ATTR_HELP } from './commands/attrMeta.js'
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
    if (scope === 'ticket' || scope === 'project' || scope === 'cloud') {
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
    .description(ATTR_HELP.description)
    .argument('<key>', 'Ticket key (e.g., 5, ABC-12, PROJ/MDT-12)')
    .argument('<attrs...>', ATTR_HELP.attrsArg)
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

  // ticket deps (MDT-189)
  ticketCmd
    .command('deps')
    .description('Check a ticket\'s dependency readiness (mdt-cli ticket deps <KEY> --check)')
    .argument('<key>', 'Ticket key (e.g., 5, ABC-12, PROJ/MDT-12)')
    .option('--check', 'Compute dependency violations (default behavior; flag kept for clarity)')
    .option('-p, --project <code>', 'Target project code')
    .option('-j, --json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .action(async (key, options) => {
      const { ticketDepsAction } = await import('./commands/deps.js')
      await runCliAction(program, 'ticket.deps', options, mergedOptions => ticketDepsAction(key, mergedOptions))
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
  // CLOUD NAMESPACE (MDT-202)
  // Thin presentation adapter over the MDT-201 CloudProjectManagementService.
  // Uses runCloudAction so failures map through the centralized cloud
  // exit-code table (C-7) instead of the generic process.exit(1).
  // ====================================================================

  const cloudCmd = program
    .command('cloud')
    .description('Cloud project management (enable, connect, status, members, credentials)')

  // Merge program-level options (global --json/--yaml) with the cloud
  // subcommand options so runCloudAction and the handlers see the effective
  // output format regardless of where --json/--yaml appeared on the argv.
  const cloudOpts = (opts: Record<string, unknown>): Record<string, unknown> =>
    ({ ...program.opts(), ...opts })

  // cloud enable --owner <email>
  cloudCmd
    .command('enable')
    .description('Provision one cloud project for the current project and bind this installation')
    .requiredOption('--owner <email>', 'Initial owner email (verified by the operator Access policy)')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudEnableAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.enable', options, () =>
        cloudEnableAction({ ownerEmail: (rawOpts as Record<string, unknown>).owner as string }, options))
    })

  // cloud login
  cloudCmd
    .command('login')
    .description('Obtain or refresh the personal Access session (does not bind this clone)')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudLoginAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.login', options, () => cloudLoginAction(options))
    })

  // cloud connect <cloud-project-uuid>
  cloudCmd
    .command('connect')
    .description('Bind this installation to an existing cloud project UUID (never provisions)')
    .argument('<cloud-project-uuid>', 'Existing cloud project UUID shared out-of-band')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (uuid, rawOpts) => {
      const { cloudConnectAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.connect', options, () =>
        cloudConnectAction({ cloudProjectId: uuid }, options))
    })

  // cloud status
  cloudCmd
    .command('status')
    .description('Report the current cloud connection state')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudStatusAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.status', options, () => cloudStatusAction(options))
    })

  // cloud doctor
  cloudCmd
    .command('doctor')
    .description('Run redacted, actionable cloud connection diagnostics')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudDoctorAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.doctor', options, () => cloudDoctorAction(options))
    })

  // cloud members <subcommand>
  const membersCmd = cloudCmd.command('members').description('Project membership management')

  membersCmd
    .command('list')
    .description('List project members and roles (owner only)')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudMembersListAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.members.list', options, () => cloudMembersListAction(options))
    })

  membersCmd
    .command('add')
    .description('Add or update a human or machine member (no password or secret accepted)')
    .argument('<principal>', 'Member principal (email for human; non-secret machine principal id for machine)')
    .requiredOption('--kind <kind>', 'Principal kind: human or machine')
    .requiredOption('--role <role>', 'Role: viewer, contributor, or owner')
    .option('--display-label <label>', 'Optional display label (defaults to the principal)')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (principal, rawOpts) => {
      const { cloudMembersAddAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      const o = rawOpts as Record<string, unknown>
      await runCloudAction('cloud.members.add', options, () =>
        cloudMembersAddAction(
          { principal, kind: o.kind as 'human' | 'machine', role: o.role as 'viewer' | 'contributor' | 'owner', ...(o.displayLabel ? { displayLabel: o.displayLabel as string } : {}) },
          options,
        ))
    })

  membersCmd
    .command('remove')
    .description('Remove a member from the project (requires confirmation unless --yes)')
    .argument('<principal>', 'Member principal')
    .requiredOption('--kind <kind>', 'Principal kind: human or machine')
    .option('--yes', 'Skip the confirmation prompt')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (principal, rawOpts) => {
      const { cloudMembersRemoveAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.members.remove', options, () =>
        cloudMembersRemoveAction({ principal, kind: (rawOpts as Record<string, unknown>).kind as 'human' | 'machine' }, options))
    })

  // cloud credentials <subcommand>
  const credentialsCmd = cloudCmd.command('credentials').description('Owner-only machine credential store management')

  credentialsCmd
    .command('install')
    .description('Install a Cloudflare service-token credential (secret read from stdin or hidden prompt; never argv)')
    .argument('<credential-ref>', 'Credential reference (runtime name)')
    .requiredOption('--client-id <id>', 'Non-secret machine principal id (Access service-token client id)')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (credentialRef, rawOpts) => {
      const { cloudCredentialsInstallAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.credentials.install', options, () =>
        cloudCredentialsInstallAction({ credentialRef, clientId: (rawOpts as Record<string, unknown>).clientId as string }, options))
    })

  credentialsCmd
    .command('status')
    .description('Show a redacted diagnostic view of one credential (never the secret)')
    .argument('<credential-ref>', 'Credential reference')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (credentialRef, rawOpts) => {
      const { cloudCredentialsStatusAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.credentials.status', options, () =>
        cloudCredentialsStatusAction({ credentialRef }, options))
    })

  credentialsCmd
    .command('remove')
    .description('Remove a credential from the owner-only store (requires confirmation unless --yes)')
    .argument('<credential-ref>', 'Credential reference')
    .option('--yes', 'Skip the confirmation prompt')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (credentialRef, rawOpts) => {
      const { cloudCredentialsRemoveAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.credentials.remove', options, () =>
        cloudCredentialsRemoveAction({ credentialRef }, options))
    })

  // cloud disable [--yes]
  cloudCmd
    .command('disable')
    .description('Disable cloud coordination; retain disabled state; ticket creation stays fail-closed')
    .option('--yes', 'Skip the confirmation prompt')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudDisableAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.disable', options, () => cloudDisableAction(options))
    })

  // cloud migrate-legacy [--yes]
  cloudCmd
    .command('migrate-legacy')
    .description('Import a legacy repository [project.cloudSync] binding into CONFIG_DIR (conflict-safe; repo untouched)')
    .option('--yes', 'Skip the confirmation prompt')
    .addOption(jsonOption())
    .addOption(yamlOption())
    .action(async (rawOpts) => {
      const { cloudMigrateLegacyAction, runCloudAction } = await import('./commands/cloud.js')
      const options = cloudOpts(rawOpts)
      await runCloudAction('cloud.migrate-legacy', options, () => cloudMigrateLegacyAction(options))
    })

  // ====================================================================
  // End of command registration
  // ====================================================================
}

/**
 * Commander Option helpers for --json/--yaml. Using `.addOption` keeps the
 * guide generator consistent across the cloud group and the rest of the CLI.
 */
function jsonOption(): Option {
  return new Option('-j, --json', 'Output as JSON')
}

function yamlOption(): Option {
  return new Option('--yaml', 'Output as YAML')
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
