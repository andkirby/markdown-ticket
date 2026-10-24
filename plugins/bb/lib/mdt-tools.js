/**
 * mdt-cli tool surface shared by the DSH and bb tool plugins
 * (docs/CRs/MDT-262). Model-facing contract: names and descriptions are
 * depended on by agents and presets — change deliberately, in one place.
 *
 * Each entry: { name, description, params: { properties, required }, argv }.
 * `argv(args)` builds the exact CLI arguments (including `--json` and the
 * optional `-p <code>` override); hosts append nothing else. Parameter
 * definitions are raw JSON-Schema objects; hosts map them to their own
 * schema format (Cordis objectSchema / zod).
 */

export const PROJECT_PARAM = {
  type: 'string',
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
      'Get one MDT ticket by key (e.g. MDT-042) with full attributes. Returns JSON. '
      + 'The project resolves from cwd by default; pass `project` only to target a different project.',
    params: { properties: { key: { type: 'string' }, project: PROJECT_PARAM }, required: ['key'] },
    argv: args => ['ticket', 'get', '--json', ...projectArgs(args), args.key],
  },
  {
    name: 'mdt_ticket_list',
    description:
      'List MDT tickets; cwd-detected project by default. Optional filter tokens as accepted by '
      + '`mdt-cli ticket list` (e.g. status=Approved, level=epic). Returns JSON.',
    params: {
      properties: { filters: { type: 'array', items: { type: 'string' } }, project: PROJECT_PARAM },
    },
    argv: args => ['ticket', 'list', '--json', ...projectArgs(args), ...(args.filters ?? [])],
  },
  {
    name: 'mdt_ticket_create',
    description:
      'Create a new MDT ticket. `title` is the full ticket title (one string). '
      + '`type` is the optional Type[/priority] marker (e.g. "Bug/high"), `slug` an optional '
      + 'URL slug. The project resolves from cwd by default; pass `project` only to target '
      + 'a different project. Returns JSON.',
    params: {
      properties: {
        title: { type: 'string', description: 'Full ticket title.' },
        type: { type: 'string', description: 'Optional Type[/priority] marker, e.g. "Bug/high".' },
        slug: { type: 'string', description: 'Optional URL slug.' },
        project: PROJECT_PARAM,
      },
      required: ['title'],
    },
    argv: args => [
      'ticket',
      'create',
      '--json',
      ...projectArgs(args),
      ...(args.type ? [args.type] : []),
      args.title,
      ...(args.slug ? [args.slug] : []),
    ],
  },
  {
    name: 'mdt_ticket_attr',
    description:
      'Update attributes of one MDT ticket. `attrs` are field=value tokens; fields: '
      + 'status, priority, level, phase, assignee, related, depends, blocks, impl-date, impl-notes. '
      + 'The project resolves from cwd by default; pass `project` only to target a different project. Returns JSON.',
    params: {
      properties: {
        key: { type: 'string' },
        attrs: { type: 'array', items: { type: 'string' } },
        project: PROJECT_PARAM,
      },
      required: ['key', 'attrs'],
    },
    argv: args => ['ticket', 'attr', '--json', ...projectArgs(args), args.key, ...args.attrs],
  },
  {
    name: 'mdt_ticket_deps',
    description:
      'Check one MDT ticket\'s dependency readiness. Set check=true for the blocking readiness verdict. Returns JSON.',
    params: {
      properties: { key: { type: 'string' }, check: { type: 'boolean' }, project: PROJECT_PARAM },
      required: ['key'],
    },
    argv: args => [
      'ticket',
      'deps',
      '--json',
      ...projectArgs(args),
      args.key,
      ...(args.check ? ['--check'] : []),
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
]
