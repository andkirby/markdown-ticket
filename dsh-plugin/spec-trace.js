/**
 * spec-trace as DeepSeek Harness model tools.
 *
 * Thin glue over the compiled spec-trace CLI through the DSH `shell` service.
 * spec-trace resolves the project root from the nearest `.mdt-config.toml`,
 * so every tool takes an optional `workdir` (any directory inside the target
 * project). Publishes no Cordis service; mounts loose in an agent preset.
 * See ./AGENTS.md for the mount contract and conventions.
 */

const SPEC_TRACE = process.env.SPEC_TRACE_BIN

export const name = 'spec-trace'

function quote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'"
}

/** camelCase flag key (e.g. sourceRef) to CLI kebab-case (e.g. --source-ref). */
function kebabFlag(key) {
  return '--' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

/**
 * Map a flags object to CLI tokens. String/number values become
 * `--key value`; `true` becomes the flag alone; `false`/undefined are
 * omitted; arrays are comma-joined (the CLI's list syntax).
 */
function flagTokens(flags) {
  const tokens = []
  for (const [key, value] of Object.entries(flags || {})) {
    if (value === undefined || value === null || value === false) continue
    tokens.push(kebabFlag(key))
    if (value === true) continue
    tokens.push(Array.isArray(value) ? value.join(',') : String(value))
  }
  return tokens
}

async function runSpecTrace(shell, args, workdir) {
  if (!SPEC_TRACE) {
    throw new Error('SPEC_TRACE_BIN is not set; point it at the compiled spec-trace binary.')
  }
  const spec = shell.resolve({
    command: [SPEC_TRACE].concat(args).map(quote).join(' '),
    workdir,
    timeoutMs: 60000,
  })
  const result = await shell.run(spec)
  if (result.exitCode !== 0) {
    throw new Error(`spec-trace exited ${result.exitCode}: ${result.stderr.text.trim()}`)
  }
  return result.stdout.text || result.stderr.text
}

function render(_args, value) {
  return [{ type: 'text', text: String(value) }]
}

const ENTITIES = {
  type: 'string',
  description: 'Trace entity: requirement | scenario | artifact | obligation | test-plan | task.',
}

const WORKDIR = {
  type: 'string',
  description:
    'Directory inside the target project (spec-trace resolves the project root ' +
    'from the nearest .mdt-config.toml). Omit only when the session cwd is already ' +
    'inside the project.',
}

export function apply(ctx) {
  const shell = ctx.get('shell')
  if (shell === undefined) {
    console.error('spec-trace plugin: shell service unavailable')
    return
  }

  function register(definition) {
    ctx.effect(() => ctx.tools.register(definition))
  }

  register({
    name: 'spec_trace_init',
    description:
      'Initialize the trace store for one ticket. Run before any upsert. Returns CLI text.',
    parameters: { ticket: { type: 'string', required: true }, workdir: WORKDIR },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(shell, ['init', args.ticket], args.workdir)
    },
  })

  register({
    name: 'spec_trace_upsert',
    description:
      'Upsert one trace entity. `entity` selects the subcommand; `flags` maps to CLI ' +
      'options as camelCase keys (sourceRef -> --source-ref, makesGreen -> --makes-green). ' +
      'Per-entity flags: requirement{kind,route,text,sourceRef,tags}, ' +
      'scenario{title,covers,given,when,then,sourceRef}, artifact{path,kind,sourceRef}, ' +
      'obligation{title,derivedFrom,artifacts,sourceRef}, testPlan{kind,title,covers,file,sourceRef}, ' +
      'task{title,owns,makesGreen,skills,sourceRef}. Array values are comma-joined. Returns CLI text.',
    parameters: {
      entity: ENTITIES,
      ticket: { type: 'string', required: true },
      id: { type: 'string', required: true },
      flags: {
        type: 'object',
        description: 'camelCase option keys; converted to kebab-case CLI flags.',
        required: true,
      },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(
        shell,
        [args.entity, 'upsert', args.ticket, args.id].concat(flagTokens(args.flags)),
        args.workdir,
      )
    },
  })

  register({
    name: 'spec_trace_list',
    description: 'List all entries of one trace entity for a ticket. Returns CLI text.',
    parameters: {
      entity: ENTITIES,
      ticket: { type: 'string', required: true },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(shell, [args.entity, 'list', args.ticket], args.workdir)
    },
  })

  register({
    name: 'spec_trace_delete',
    description:
      'Delete one trace entity entry. Uses --if-exists semantics so re-running is safe. Returns JSON.',
    parameters: {
      entity: ENTITIES,
      ticket: { type: 'string', required: true },
      id: { type: 'string', required: true },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(
        shell,
        [args.entity, 'delete', args.ticket, args.id, '--if-exists', '--format', 'json'],
        args.workdir,
      )
    },
  })

  register({
    name: 'spec_trace_validate',
    description:
      'Validate one ticket at a stage (requirements | bdd | architecture | tests | tasks | all). ' +
      'Set strict=true for the strict gate. Returns JSON.',
    parameters: {
      ticket: { type: 'string', required: true },
      stage: { type: 'string', required: true },
      strict: { type: 'boolean' },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(
        shell,
        ['validate', args.ticket, '--stage', args.stage, '--format', 'json']
          .concat(args.strict ? ['--strict'] : []),
        args.workdir,
      )
    },
  })

  register({
    name: 'spec_trace_render',
    description:
      'Render trace docs for one ticket: stage is requirements | bdd | architecture | ' +
      'tests | tasks | all. Writes <ticket>/<stage>.trace.md files. Returns CLI text.',
    parameters: {
      stage: { type: 'string', required: true },
      ticket: { type: 'string', required: true },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      return runSpecTrace(shell, ['render', args.stage, args.ticket], args.workdir)
    },
  })

  register({
    name: 'spec_trace_bundle',
    description:
      'Build the execution bundle for one task: format md|json, profile executor|audit, ' +
      'optional --out path. Returns the bundle.',
    parameters: {
      ticket: { type: 'string', required: true },
      taskId: { type: 'string', required: true },
      format: { type: 'string', description: 'md (default) or json.' },
      profile: { type: 'string', description: 'executor (default) or audit.' },
      out: { type: 'string', description: 'Output file path instead of stdout.' },
      workdir: WORKDIR,
    },
    output: { schema: { type: 'string' }, render },
    async execute(args) {
      const flags = {}
      if (args.format) flags.format = args.format
      if (args.profile) flags.profile = args.profile
      if (args.out) flags.out = args.out
      return runSpecTrace(
        shell,
        ['bundle', 'task', args.ticket, args.taskId].concat(flagTokens(flags)),
        args.workdir,
      )
    },
  })
}
