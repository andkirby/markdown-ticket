/**
 * mdt-cli tool surface shared by the DSH and bb tool plugins
 * (docs/CRs/MDT-262). Model-facing contract: names and descriptions are
 * depended on by agents and presets — change deliberately, in one place.
 *
 * Each entry: { name, description, params: { properties, required }, argv, stdin? }.
 * `argv(args)` builds the exact CLI arguments (including `--json` where supported and the
 * optional `-p <code>` override); hosts append nothing else. Parameter
 * definitions are raw JSON-Schema objects; hosts map them to their own
 * schema format (Cordis objectSchema / zod).
 */

// --guide is intercepted before Commander even after --; reject it at the boundary.
const POSITIONAL = { type: 'string', minLength: 1, pattern: '^(?!--guide$)[\\s\\S]*$' }
const OPTION_VALUE = { ...POSITIONAL, pattern: '^(?!-)[\\s\\S]+$' }

function positionalArgs(tokens) {
  return tokens.length ? ['--', ...tokens] : []
}

export const PROJECT_PARAM = {
  ...OPTION_VALUE,
  description:
    'Optional project code. Omit to use the project detected from the current working '
    + 'directory (the default and recommended path); pass only to target a different '
    + 'project than cwd.',
}

function projectArgs(args) {
  return args.project ? ['-p', args.project] : []
}

export const MDT_TOOLS = [
  {
    name: 'mdt_ticket_get',
    description:
      'Get one MDT ticket by key (e.g. MDT-042) with full attributes, including stored external refs. Returns JSON. '
      + 'The project resolves from cwd by default; pass `project` only to target a different project.',
    params: { properties: { key: POSITIONAL, project: PROJECT_PARAM }, required: ['key'] },
    argv: args => ['ticket', 'get', '--json', ...projectArgs(args), ...positionalArgs([args.key])],
  },
  {
    name: 'mdt_ticket_list',
    description:
      'List MDT tickets; cwd-detected project by default. Optional filter tokens as accepted by '
      + '`mdt-cli ticket list` (e.g. status=Approved, level=epic). Returns JSON.',
    params: {
      properties: {
        filters: { type: 'array', items: POSITIONAL },
        project: PROJECT_PARAM,
        all: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1 },
        offset: { type: 'integer', minimum: 0 },
        files: { type: 'boolean' },
        info: { type: 'boolean' },
      },
    },
    argv: args => [
      'ticket',
      'list',
      '--json',
      ...projectArgs(args),
      ...(args.all ? ['--all'] : []),
      ...(args.limit !== undefined ? ['--limit', String(args.limit)] : []),
      ...(args.offset !== undefined ? ['--offset', String(args.offset)] : []),
      ...(args.files ? ['--files'] : []),
      ...(args.info ? ['--info'] : []),
      ...positionalArgs(args.filters ?? []),
    ],
  },
  {
    name: 'mdt_ticket_create',
    description:
      'Create a new MDT ticket. `title` is the full ticket title (one string). '
      + '`type` is the optional Type[/priority] marker (e.g. "Bug/high"), `slug` an optional '
      + 'URL slug. The project resolves from cwd by default; pass `project` only to target '
      + 'a different project. To attach external refs, follow creation with mdt_ticket_attr. Returns JSON.',
    params: {
      properties: {
        title: { ...POSITIONAL, description: 'Full ticket title.' },
        type: { ...POSITIONAL, description: 'Optional Type[/priority] marker, e.g. "Bug/high".' },
        slug: { ...POSITIONAL, description: 'Optional URL slug.' },
        project: PROJECT_PARAM,
        content: { type: 'string', description: 'Optional markdown body, supplied through stdin.' },
      },
      required: ['title'],
    },
    argv: args => [
      'ticket',
      'create',
      '--json',
      ...projectArgs(args),
      ...(args.content !== undefined ? ['--stdin'] : []),
      ...positionalArgs([...(args.type ? [args.type] : []), args.title, ...(args.slug ? [args.slug] : [])]),
    ],
    stdin: args => args.content,
  },
  {
    name: 'mdt_ticket_attr',
    description:
      'Update attributes of one MDT ticket. `attrs` are field=value tokens; fields: '
      + 'status, priority, level, phase, assignee, component, related, depends, blocks, refs, impl-date, impl-notes. '
      + 'Relations and refs support = (replace), += (add), -= (remove). '
      + 'External refs are ordered instance-scoped identities, e.g. refs=work:PRJ-123,gh:acme/widgets#42; '
      + 'refs= clears them; refs-= removes exact stored strings only. '
      + 'The project resolves from cwd by default; pass `project` only to target a different project. Returns JSON.',
    params: {
      properties: {
        key: POSITIONAL,
        attrs: {
          type: 'array',
          items: POSITIONAL,
          minItems: 1,
          description: 'Attribute operations, e.g. refs+=gh:acme/widgets#42 or refs=. For identifiers containing commas, use a JSON string array operand.',
        },
        project: PROJECT_PARAM,
      },
      required: ['key', 'attrs'],
    },
    argv: args => ['ticket', 'attr', '--json', ...projectArgs(args), ...positionalArgs([args.key, ...args.attrs])],
  },
  {
    name: 'mdt_ticket_deps',
    description:
      'Check one MDT ticket\'s dependency readiness. Set check=true for the blocking readiness verdict. Returns JSON.',
    params: {
      properties: { key: POSITIONAL, check: { type: 'boolean' }, project: PROJECT_PARAM },
      required: ['key'],
    },
    argv: args => [
      'ticket',
      'deps',
      '--json',
      ...projectArgs(args),
      ...(args.check ? ['--check'] : []),
      ...positionalArgs([args.key]),
    ],
  },
  {
    name: 'mdt_project_current',
    description:
      'Get the MDT project resolved from the current working directory: code, name, root, '
      + 'tickets path. Use this when you need the session project code to anchor ticket keys. '
      + 'Returns JSON.',
    params: { properties: {} },
    argv: () => ['project', '--json'],
  },
  {
    name: 'mdt_project_list',
    description:
      'List all MDT projects known to mdt-cli. Rarely needed: ticket tools resolve the cwd '
      + 'project automatically and `mdt_project_current` returns the session project. Use only '
      + 'for cross-project work or when cwd is not inside a project. Returns JSON.',
    params: { properties: {} },
    argv: () => ['project', 'ls', '--json'],
  },
  {
    name: 'mdt_ticket_delete',
    description: 'Delete a ticket in the cwd project only. Returns JSON. Set force to skip confirmation.',
    params: { properties: { key: POSITIONAL, force: { type: 'boolean' } }, required: ['key'] },
    argv: args => ['ticket', 'delete', '--json', ...(args.force ? ['--force'] : []), ...positionalArgs([args.key])],
  },
  {
    name: 'mdt_ticket_rename',
    description: 'Rename a ticket title and optional file slug. Returns CLI text. Use an explicit ticket key to select its project; no project option.',
    params: { properties: { key: POSITIONAL, title: POSITIONAL, slug: POSITIONAL }, required: ['key', 'title'] },
    argv: args => ['ticket', 'rename', ...positionalArgs([args.key, args.title, ...(args.slug ? [args.slug] : [])])],
  },
  {
    name: 'mdt_project_get',
    description: 'Get project details by code. Covers the CLI project info alias. Returns JSON.',
    params: { properties: { code: POSITIONAL }, required: ['code'] },
    argv: args => ['project', 'get', '--json', ...positionalArgs([args.code])],
  },
  {
    name: 'mdt_project_init',
    description: 'Initialize a project in an existing directory. dir is relative to the thread workspace; ticketsPath is relative to the project root. Returns JSON.',
    params: { properties: { code: POSITIONAL, name: POSITIONAL, dir: OPTION_VALUE, ticketsPath: OPTION_VALUE }, required: ['code', 'name'] },
    argv: args => ['project', 'init', '--json', ...(args.dir ? ['--dir', args.dir] : []), ...(args.ticketsPath ? ['--tickets-path', args.ticketsPath] : []), ...positionalArgs([args.code, args.name])],
  },
]
