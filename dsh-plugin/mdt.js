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
  description: 'Project code; avoids needing the project as cwd.',
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

/** Run mdt-cli with JSON output; non-zero exits become tool errors. */
async function runMdt(shell, args, sandboxPolicy) {
  const spec = shell.resolve({
    command: [CLI].concat(args).map(quote).join(' '),
    timeoutMs: 30000,
    ...(sandboxPolicy !== undefined ? { sandboxPolicy } : {}),
  })
  const result = await shell.run(spec)
  if (result.exitCode !== 0) {
    throw new Error(`mdt-cli exited ${result.exitCode}: ${result.stderr.text.trim()}`)
  }
  return result.stdout.text
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
      'Pass `project` to target a project explicitly instead of relying on cwd.',
    parameters: objectSchema(
      { key: { type: 'string' }, project: PROJECT_PARAM },
      ['key'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(shell, ['ticket', 'get', '--json', ...projectArgs(args), args.key], policyFor(exec))
    },
  })

  register({
    name: 'mdt_ticket_list',
    description:
      'List MDT tickets. Optional filter tokens as accepted by `mdt-cli ticket list` ' +
      '(e.g. status=Approved, level=epic, project=<code>). Returns JSON.',
    parameters: objectSchema({
      filters: { type: 'array', items: { type: 'string' } },
      project: PROJECT_PARAM,
    }),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        ['ticket', 'list', '--json', ...projectArgs(args), ...(args.filters ?? [])],
        policyFor(exec),
      )
    },
  })

  register({
    name: 'mdt_ticket_create',
    description:
      'Create a new MDT ticket. `tokens` are the title words (and any CLI options) ' +
      'passed to `mdt-cli ticket create`. Pass `project` instead of relying on cwd. Returns JSON.',
    parameters: objectSchema(
      { tokens: { type: 'array', items: { type: 'string' } }, project: PROJECT_PARAM },
      ['tokens'],
    ),
    output: { schema: { type: 'string' }, render },
    async execute(args, exec) {
      return runMdt(
        shell,
        ['ticket', 'create', '--json', ...projectArgs(args), ...args.tokens],
        policyFor(exec),
      )
    },
  })

  register({
    name: 'mdt_ticket_attr',
    description:
      'Update attributes of one MDT ticket. `attrs` are field=value tokens; fields: ' +
      'status, priority, level, phase, assignee, related, depends, blocks, impl-date, impl-notes. ' +
      'Pass `project` to target a project explicitly instead of relying on cwd. Returns JSON.',
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
        policyFor(exec),
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
        policyFor(exec),
      )
    },
  })

  register({
    name: 'mdt_project_list',
    description: 'List all MDT projects known to mdt-cli. Returns JSON.',
    parameters: objectSchema({}),
    output: { schema: { type: 'string' }, render },
    async execute(_args, exec) {
      return runMdt(shell, ['project', 'ls', '--json'], policyFor(exec))
    },
  })
}
