/**
 * mdt-cli as DeepSeek Harness model tools.
 *
 * Thin glue over `../cli/bin/mdt-cli --json` through the DSH `shell` service.
 * Publishes no Cordis service; mounts loose in an agent preset.
 * See ./AGENTS.md for the mount contract and conventions.
 */

const CLI = new URL('../cli/bin/mdt-cli', import.meta.url).pathname

export const name = 'mdt'
export const inject = ['tools', 'shell']

const PROJECT_PARAM = {
  type: 'string',
  description:
    'Optional project code. Omit to use the project detected from the current working ' +
    'directory (the default and recommended path); pass only to target a different ' +
    'project than cwd.',
}

/** Full JSON-Schema object; raw registrations are not converted from shorthand. */
function objectSchema(properties, required) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required ? { required } : []),
  }
}

function quote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'"
}

/**
 * Run mdt-cli with JSON output; non-zero exits become tool errors.
 * Runs at the calling session's cwd so mdt-cli's cwd-based project detection
 * resolves the session workspace, matching the bash tool's default.
 */
async function runMdt(shell, args, execInfo) {
  const spec = shell.resolve({
    command: [CLI].concat(args).map(quote).join(' '),
    timeoutMs: 30000,
    ...(execInfo?.workdir !== undefined ? { workdir: execInfo.workdir } : {}),
    ...(execInfo?.policy !== undefined ? { sandboxPolicy: execInfo.policy } : {}),
  })
  const result = await shell.run(spec)
  if (result.exitCode !== 0) {
    throw new Error(`mdt-cli exited ${result.exitCode}: ${errorDetail(result)}`)
  }
  return result.stdout.text
}

/**
 * Error text for a failed run. Prefer the CLI's structured JSON error on
 * stdout; from stderr drop the benign config-dir warning (sandboxed hosts
 * cannot write ~/.config, mdt-cli continues with a fallback) so the real
 * cause stays visible instead of implicating the sandbox.
 */
function errorDetail(result) {
  const stdout = result.stdout.text.trim()
  if (stdout !== '') return stdout
  const stderr = result.stderr.text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('⚠️'))
    .join('\n')
  return stderr !== '' ? stderr : result.stderr.text.trim()
}

function render(_args, value) {
  return [{ type: 'text', text: String(value) }]
}

export function apply(ctx) {
  const shell = ctx.get('shell')
  const tools = ctx.get('tools')
  const sandboxPolicy = ctx.get('sandboxPolicy')
  if (shell === undefined || tools === undefined) {
    console.error('mdt plugin: shell or tools service unavailable')
    return
  }

  /** Resolve the calling session's live sandbox policy so the subprocess follows it. */
  function policyFor(exec) {
    if (sandboxPolicy === undefined || exec?.agent === undefined) return undefined
    return sandboxPolicy.resolve({ session: exec.agent.session })
  }

  /**
   * Session cwd for the subprocess (mirrors the bash tool's resolveWorkdir):
   * the sandbox policy's canonical workspace root wins, else the session
   * header cwd. Without this, mdt-cli runs at the host cwd and its
   * .mdt-config.toml walk-up never sees the session workspace.
   */
  function workdirFor(exec, policy) {
    if (policy !== undefined && policy.workspaceRoot !== undefined) return policy.workspaceRoot
    const headerCwd = exec?.agent?.session?.header?.cwd
    return typeof headerCwd === 'string' && headerCwd !== '' ? headerCwd : undefined
  }

  /** Per-call exec context: sandbox policy plus the session workdir. */
  function execContext(exec) {
    const policy = policyFor(exec)
    return { policy, workdir: workdirFor(exec, policy) }
  }

  /** Optional `project` arg becomes `-p <code>` so operations work from any cwd. */
  function projectArgs(args) {
    return args.project ? ['-p', args.project] : []
  }

  function register(definition) {
    ctx.effect(() => tools.register(definition))
  }

  register({
    name: 'mdt_ticket_get',
    description:
      'Get one MDT ticket by key (e.g. MDT-042) with full attributes. Returns JSON. ' +
      'The project resolves from cwd by default; pass `project` only to target a different project.',
    parameters: objectSchema(
      { key: { type: 'string' }, project: PROJECT_PARAM },
      ['key'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(shell, ['ticket', 'get', '--json', ...projectArgs(args), args.key], execContext(exec))
    },
  })

  register({
    name: 'mdt_ticket_list',
    description:
      'List MDT tickets; cwd-detected project by default. Optional filter tokens as accepted by ' +
      '`mdt-cli ticket list` (e.g. status=Approved, level=epic). Returns JSON.',
    parameters: objectSchema({
      filters: { type: 'array', items: { type: 'string' } },
      project: PROJECT_PARAM,
    }),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        ['ticket', 'list', '--json', ...projectArgs(args), ...(args.filters ?? [])],
        execContext(exec),
      )
    },
  })

  register({
    name: 'mdt_ticket_create',
    description:
      'Create a new MDT ticket. `title` is the full ticket title (one string). ' +
      '`type` is the optional Type[/priority] marker (e.g. "Bug/high"), `slug` an optional ' +
      'URL slug. The project resolves from cwd by default; pass `project` only to target ' +
      'a different project. Returns JSON.',
    parameters: objectSchema(
      {
        title: { type: 'string', description: 'Full ticket title.' },
        type: { type: 'string', description: 'Optional Type[/priority] marker, e.g. "Bug/high".' },
        slug: { type: 'string', description: 'Optional URL slug.' },
        project: PROJECT_PARAM,
      },
      ['title'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        [
          'ticket', 'create', '--json', ...projectArgs(args),
          ...(args.type ? [args.type] : []),
          args.title,
          ...(args.slug ? [args.slug] : []),
        ],
        execContext(exec),
      )
    },
  })

  register({
    name: 'mdt_ticket_attr',
    description:
      'Update attributes of one MDT ticket. `attrs` are field=value tokens; fields: ' +
      'status, priority, level, phase, assignee, related, depends, blocks, impl-date, impl-notes. ' +
      'The project resolves from cwd by default; pass `project` only to target a different project. Returns JSON.',
    parameters: objectSchema(
      {
        key: { type: 'string' },
        attrs: { type: 'array', items: { type: 'string' } },
        project: PROJECT_PARAM,
      },
      ['key', 'attrs'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        ['ticket', 'attr', '--json', ...projectArgs(args), args.key, ...args.attrs],
        execContext(exec),
      )
    },
  })

  register({
    name: 'mdt_ticket_deps',
    description:
      "Check one MDT ticket's dependency readiness. Set check=true for the blocking readiness verdict. Returns JSON.",
    parameters: objectSchema(
      { key: { type: 'string' }, check: { type: 'boolean' }, project: PROJECT_PARAM },
      ['key'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        [
          'ticket', 'deps', '--json', ...projectArgs(args), args.key,
          ...(args.check ? ['--check'] : []),
        ],
        execContext(exec),
      )
    },
  })

  register({
    name: 'mdt_project_current',
    description:
      'Get the MDT project resolved from the current working directory: code, name, root, ' +
      'tickets path. Use this when you need the session project code to anchor ticket keys. ' +
      'Returns JSON.',
    parameters: objectSchema({}),
    output: { schema: { type: 'string' }, render },
    async execute(_args, exec) {
      return runMdt(shell, ['project', '--json'], execContext(exec))
    },
  })

  register({
    name: 'mdt_project_list',
    description:
      'List all MDT projects known to mdt-cli. Rarely needed: ticket tools resolve the cwd ' +
      'project automatically and `mdt_project_current` returns the session project. Use only ' +
      'for cross-project work or when cwd is not inside a project. Returns JSON.',
    parameters: objectSchema({}),
    output: { schema: { type: 'string' }, render },
    async execute(_args, exec) {
      return runMdt(shell, ['project', 'ls', '--json'], execContext(exec))
    },
  })
}
