/**
 * CLI Argument Shortcut Normalization (MDT-143)
 *
 * Normalizes approved shortcut forms into canonical commander tree commands.
 * This function runs BEFORE commander parses process.argv.
 *
 * IMPORTANT: This MUST NOT become a second command parser.
 * It only rewrites known shortcut patterns into canonical forms.
 *
 * Approved shortcuts:
 * - Bare number: "5" → "ticket get 5"
 * - t alias: "t ABC-12" → "ticket get ABC-12"
 * - ticket namespace: "ticket 5" → "ticket get 5"
 * - list shortcuts: "list", "ls" → "ticket list"
 * - create/attr/rename/delete: "create ..." → "ticket create ...", "attr ..." → "ticket attr ...", "rename ..." → "ticket rename ...", "delete ..." → "ticket delete ..."
 * - Cross-project: "ABC/MDT-12" → "ticket get ABC/MDT-12"
 * - project namespace: "project" → "project current", "project <code>" → "project get <code>"
 */

/**
 * Normalize shortcuts in process.argv before commander parsing
 *
 * @param argv - process.argv array to normalize (will be mutated in place)
 * @returns Normalized argv array (same reference as input)
 */
export function normalizeShortcuts(argv: string[]): string[] {
  if (argv.length < 3) {
    return argv
  }

  // Skip node/bun executable and script path
  const [exec, script, ...args] = argv

  // Helper to reconstruct argv
  const buildArgv = (newArgs: string[]): string[] => [exec, script, ...newArgs]

  // No arguments - return as-is
  if (args.length === 0) {
    return argv
  }

  const [first, ...rest] = args

  // Pattern 1: Bare number (e.g., "5", "005", "123") → ticket get
  if (/^\d+$/.test(first)) {
    return buildArgv(['ticket', 'get', first, ...rest])
  }

  // Pattern 2: t alias (e.g., "t ABC-12") → ticket get
  if (first === 't') {
    if (rest.length === 0) {
      // Just "t" without args - treat as "ticket" namespace
      return buildArgv(['ticket', ...rest])
    }
    return buildArgv(['ticket', 'get', ...rest])
  }

  // Pattern 3: ticket namespace with bare number (e.g., "ticket 5") → ticket get
  if (first === 'ticket' && rest.length > 0) {
    const [second, ...restRest] = rest
    if (/^\d+$/.test(second)) {
      return buildArgv(['ticket', 'get', second, ...restRest])
    }
  }

  // Pattern 4: list shortcuts → ticket list
  if (first === 'list' || first === 'ls') {
    return buildArgv(['ticket', 'list', ...rest])
  }

  // Pattern 5: create/attr/rename shortcuts → ticket create/attr/rename
  if (first === 'create') {
    return buildArgv(['ticket', 'create', ...rest])
  }

  if (first === 'attr') {
    return buildArgv(['ticket', 'attr', ...rest])
  }

  if (first === 'rename') {
    return buildArgv(['ticket', 'rename', ...rest])
  }

  if (first === 'delete') {
    return buildArgv(['ticket', 'delete', ...rest])
  }

  // Pattern 6: Cross-project ticket key (e.g., "ABC/MDT-12") → ticket get
  // Pattern: PROJECT-CODE/TICKET-KEY or PROJECT/TICKET-NUMBER
  const crossProjectPattern = /^[^/]+\/[a-z0-9]+-\d+$/i
  if (crossProjectPattern.test(first)) {
    return buildArgv(['ticket', 'get', first, ...rest])
  }

  // Pattern 7: Full ticket key as bare argument (e.g., "ABC-012") → ticket get
  const fullKeyPattern = /^[a-z][a-z0-9]*-\d+$/i
  if (fullKeyPattern.test(first)) {
    return buildArgv(['ticket', 'get', first, ...rest])
  }

  // Pattern 8: project namespace shortcuts
  // Reserved subcommands (exact lowercase only): current, get, info, ls, list, init
  const reservedProjectSubcommands = ['current', 'get', 'info', 'ls', 'list', 'init']

  if (first === 'project') {
    if (rest.length === 0) {
      // "project" with no args → "project current"
      return buildArgv(['project', 'current', ...rest])
    }

    const [second, ...restRest] = rest

    // If second arg starts with --, it's an option, not a subcommand — pass through
    if (second.startsWith('--') || second.startsWith('-')) {
      // Let commander handle "project --guide" as-is
      return argv
    }

    // If second arg is NOT a reserved subcommand (case-sensitive), treat as project code
    if (!reservedProjectSubcommands.includes(second)) {
      // "project <code>" → "project get <code>"
      return buildArgv(['project', 'get', second, ...restRest])
    }

    // Otherwise, let commander handle the subcommand as-is
  }

  // No shortcuts matched - return argv as-is
  return argv
}
