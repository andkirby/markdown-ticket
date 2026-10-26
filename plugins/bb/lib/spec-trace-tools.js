/**
 * spec-trace CLI tool surface shared by the DSH and bb tool plugins
 * (docs/CRs/MDT-262). Model-facing contract: change names/descriptions
 * deliberately. spec-trace resolves the project root from the nearest
 * `.mdt-config.toml`, so every tool takes an optional `workdir` (any
 * directory inside the target project) — this is a deliberate contract
 * difference from the mdt tools, which rely on the session cwd.
 *
 * Output contract: spec-trace returns CLI text (stdout, falling back to
 * stderr); some commands request JSON themselves via `--format json`.
 */

import { flagTokens } from './run-cli.js'

export const ENTITIES = {
  type: 'string',
  enum: ['requirement', 'scenario', 'artifact', 'obligation', 'test-plan', 'task'],
  description: 'Trace entity: requirement | scenario | artifact | obligation | test-plan | task.',
}

export const WORKDIR = {
  type: 'string',
  description:
    'Directory inside the target project (spec-trace resolves the project root '
    + 'from the nearest .mdt-config.toml). Omit only when the session cwd is already '
    + 'inside the project.',
}

const STAGE = { type: 'string', enum: ['requirements', 'bdd', 'architecture', 'tests', 'tasks', 'all'] }
const FLAG_TEXT = { type: 'string', minLength: 1, pattern: '^(?!--)[\\s\\S]+$' }
const FLAG_LIST = { anyOf: [FLAG_TEXT, { type: 'array', minItems: 1, items: FLAG_TEXT }] }
const FLAGS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: FLAG_TEXT,
    route: FLAG_TEXT,
    text: FLAG_TEXT,
    sourceRef: FLAG_TEXT,
    title: FLAG_TEXT,
    given: FLAG_TEXT,
    when: FLAG_TEXT,
    then: FLAG_TEXT,
    path: FLAG_TEXT,
    file: FLAG_TEXT,
    tags: FLAG_LIST,
    covers: FLAG_LIST,
    derivedFrom: FLAG_LIST,
    artifacts: FLAG_LIST,
    owns: FLAG_LIST,
    makesGreen: FLAG_LIST,
    skills: FLAG_LIST,
  },
  description: 'Per-entity camelCase CLI flags; list values are comma-joined.',
}

export const SPEC_TRACE_TOOLS = [
  {
    name: 'spec_trace_init',
    description:
      'Initialize the trace store for one ticket. Run before any upsert. Returns CLI text.',
    params: { properties: { ticket: { type: 'string' }, workdir: WORKDIR }, required: ['ticket'] },
    argv: args => ['init', args.ticket],
  },
  {
    name: 'spec_trace_upsert',
    description:
      'Upsert one trace entity. `entity` selects the subcommand; `flags` maps to CLI '
      + 'options as camelCase keys (sourceRef -> --source-ref, makesGreen -> --makes-green). '
      + 'Per-entity flags: requirement{kind,route,text,sourceRef,tags}, '
      + 'scenario{title,covers,given,when,then,sourceRef}, artifact{path,kind,sourceRef}, '
      + 'obligation{title,derivedFrom,artifacts,sourceRef}, test-plan{kind,title,covers,file,sourceRef}, '
      + 'task{title,owns,makesGreen,skills,sourceRef}. Array values are comma-joined. Returns CLI text.',
    params: {
      properties: {
        entity: ENTITIES,
        ticket: { type: 'string' },
        id: { type: 'string' },
        flags: FLAGS,
        workdir: WORKDIR,
      },
      required: ['entity', 'ticket', 'id', 'flags'],
    },
    argv: args => [args.entity, 'upsert', args.ticket, args.id, ...flagTokens(args.flags)],
  },
  {
    name: 'spec_trace_list',
    description: 'List all entries of one trace entity for a ticket. Returns CLI text.',
    params: {
      properties: { entity: ENTITIES, ticket: { type: 'string' }, workdir: WORKDIR },
      required: ['entity', 'ticket'],
    },
    argv: args => [args.entity, 'list', args.ticket],
  },
  {
    name: 'spec_trace_delete',
    description:
      'Delete one trace entity entry. Uses --if-exists semantics so re-running is safe. dryRun previews without mutation. Returns JSON.',
    params: {
      properties: {
        entity: ENTITIES,
        ticket: { type: 'string' },
        id: { type: 'string' },
        dryRun: { type: 'boolean' },
        workdir: WORKDIR,
      },
      required: ['entity', 'ticket', 'id'],
    },
    argv: args => ['delete', args.entity, args.ticket, args.id, '--if-exists', '--format', 'json', ...(args.dryRun ? ['--dry-run'] : [])],
  },
  {
    name: 'spec_trace_validate',
    description:
      'Validate one ticket at a stage (requirements | bdd | architecture | tests | tasks | all). '
      + 'Set strict=true for the strict gate. Returns JSON.',
    params: {
      properties: {
        ticket: { type: 'string' },
        stage: STAGE,
        strict: { type: 'boolean' },
        workdir: WORKDIR,
      },
      required: ['ticket', 'stage'],
    },
    argv: args => [
      'validate',
      args.ticket,
      '--stage',
      args.stage,
      '--format',
      'json',
      ...(args.strict ? ['--strict'] : []),
    ],
  },
  {
    name: 'spec_trace_render',
    description:
      'Render trace docs for one ticket: stage is requirements | bdd | architecture | '
      + 'tests | tasks | all. Writes <ticket>/<stage>.trace.md files. Returns CLI text.',
    params: {
      properties: { stage: STAGE, ticket: { type: 'string' }, noCrossLinks: { type: 'boolean' }, workdir: WORKDIR },
      required: ['stage', 'ticket'],
    },
    argv: args => ['render', args.stage, args.ticket, ...(args.noCrossLinks ? ['--no-cross-links'] : [])],
  },
  {
    name: 'spec_trace_bundle',
    description:
      'Build the execution bundle for one task: format md|json, profile executor|audit, '
      + 'optional --out path. Returns the bundle.',
    params: {
      properties: {
        ticket: { type: 'string' },
        taskId: { type: 'string' },
        format: { type: 'string', enum: ['md', 'json'], description: 'md (default) or json.' },
        profile: { type: 'string', enum: ['executor', 'audit'], description: 'executor (default) or audit.' },
        out: { type: 'string', description: 'Output file path instead of stdout.' },
        workdir: WORKDIR,
      },
      required: ['ticket', 'taskId'],
    },
    argv: (args) => {
      const flags = {}
      if (args.format)
        flags.format = args.format
      if (args.profile)
        flags.profile = args.profile
      if (args.out)
        flags.out = args.out
      return ['bundle', 'task', args.ticket, args.taskId, ...flagTokens(flags)]
    },
  },
  {
    name: 'spec_trace_lock_requirements',
    description: 'Lock the current requirements baseline for strict drift validation. Returns CLI text.',
    params: { properties: { ticket: { type: 'string' }, workdir: WORKDIR }, required: ['ticket'] },
    argv: args => ['lock', 'requirements', args.ticket],
  },
]
