/**
 * CLI Command Guide Generator (MDT-143)
 *
 * Generates a command manual from the registered commander tree.
 * Supports global scope (all commands) and per-namespace scope.
 */

import type { Command } from 'commander'

/**
 * Generate a command guide from the commander tree
 *
 * @param program - The commander program or sub-command
 * @param scope - Optional scope label (e.g., "ticket", "project")
 * @returns Formatted guide string
 */
export function generateGuide(program: Command, scope?: string): string {
  const lines: string[] = []

  // Title
  if (scope) {
    lines.push(`mdt-cli ${scope} — Command Reference`)
  }
  else {
    lines.push('mdt-cli — Command Reference')
  }
  lines.push('─'.repeat(50))
  lines.push('')

  // Version info (global only)
  if (!scope) {
    const cmdAny = program as any
    lines.push(`Version: ${cmdAny._version || 'unknown'}`)
    lines.push('')
  }

  // Description
  if (program.description()) {
    lines.push(program.description()!)
    lines.push('')
  }

  // Get top-level commands to document
  const commands = getDocumentableCommands(program)

  for (const cmd of commands) {
    const cmdAny = cmd as any
    const name = cmd.name()
    const aliases = cmd.aliases().filter(a => a !== name)
    const aliasStr = aliases.length > 0 ? ` (aliases: ${aliases.join(', ')})` : ''

    // Command header
    lines.push(`  ${name}${aliasStr}`)
    if (cmd.description()) {
      lines.push(`    ${cmd.description()}`)
    }

    // Arguments
    const args: any[] = cmdAny.registeredArguments || []
    if (args.length > 0) {
      const argStr = args.map((a: any) => {
        const required = a.required ? '' : ' [optional]'
        const desc = a.description ? ` — ${a.description}` : ''
        return `    <${a.name()}${required}>${desc}`
      }).join('\n')
      lines.push(argStr)
    }

    // Options
    const opts: any[] = cmdAny.options || []
    if (opts.length > 0) {
      for (const opt of opts) {
        if (opt.hidden) continue
        const flags = [opt.long, opt.short].filter(Boolean).join(', ')
        const desc = opt.description ? ` — ${String(opt.description).replace(/\n/g, ' ')}` : ''
        lines.push(`    ${flags}${desc}`)
      }
    }

    // Sub-commands (if any, and we're at global scope)
    if (!scope) {
      const subCommands = getDocumentableCommands(cmd)
      if (subCommands.length > 0) {
        lines.push('    Subcommands:')
        for (const sub of subCommands) {
          const subAliases = sub.aliases().filter(a => a !== sub.name())
          const subAliasStr = subAliases.length > 0 ? ` (aliases: ${subAliases.join(', ')})` : ''
          const subDesc = sub.description() ? ` — ${sub.description()}` : ''
          lines.push(`      ${sub.name()}${subAliasStr}${subDesc}`)
        }
      }
    }

    lines.push('')
  }

  // Usage examples
  if (!scope) {
    lines.push('Examples:')
    lines.push('  mdt-cli 12                    View ticket MDT-012')
    lines.push('  mdt-cli list status=impl     List tickets matching filter')
    lines.push('  mdt-cli ticket create feature "My feature"')
    lines.push('  mdt-cli ticket attr MDT-012 status=implemented')
    lines.push('  mdt-cli project current      Show current project')
    lines.push('  mdt-cli project ls           List all projects')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Get documentable commands from a commander program/command
 */
function getDocumentableCommands(program: Command): Command[] {
  return program.commands.filter(cmd => {
    if (cmd.name() === 'help') return false
    const cmdAny = cmd as any
    if (cmdAny._hidden) return false
    return true
  })
}
