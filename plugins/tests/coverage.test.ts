import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

import { MDT_TOOLS } from '../_lib/mdt-tools.js'
import { SPEC_TRACE_TOOLS } from '../_lib/spec-trace-tools.js'
import { quote } from '../dsh/lib/kit.js'
import { apply as applyMdt } from '../dsh/mdt.js'
import { apply as applySpecTrace } from '../dsh/spec-trace.js'

const MDT_NAMES = [
  'mdt_ticket_get',
  'mdt_ticket_list',
  'mdt_ticket_create',
  'mdt_ticket_attr',
  'mdt_ticket_deps',
  'mdt_ticket_delete',
  'mdt_ticket_rename',
  'mdt_project_current',
  'mdt_project_list',
  'mdt_project_get',
  'mdt_project_init',
]
const TRACE_NAMES = [
  'spec_trace_init',
  'spec_trace_upsert',
  'spec_trace_list',
  'spec_trace_delete',
  'spec_trace_validate',
  'spec_trace_render',
  'spec_trace_bundle',
  'spec_trace_lock_requirements',
]

function definition(name: string) {
  const tool = [...MDT_TOOLS, ...SPEC_TRACE_TOOLS].find(t => t.name === name)
  expect(tool, `missing canonical definition: ${name}`).toBeDefined()
  return tool!
}

describe('MDT-262 canonical non-cloud command coverage', () => {
  test('exposes exactly eleven MDT and eight operational trace tools', () => {
    expect(MDT_TOOLS.map(t => t.name).sort()).toEqual([...MDT_NAMES].sort())
    expect(SPEC_TRACE_TOOLS.map(t => t.name).sort()).toEqual([...TRACE_NAMES].sort())
    expect([...MDT_TOOLS, ...SPEC_TRACE_TOOLS].some(t => /cloud|fragment|cli_run/.test(t.name))).toBe(false)
  })

  const cases: Array<[string, Record<string, unknown>, string[]]> = [
    ['mdt_ticket_get', { key: '--force', project: 'ABC' }, ['ticket', 'get', '--json', '-p', 'ABC', '--', '--force']],
    ['mdt_ticket_list', { project: 'ABC', limit: 2, offset: 0, files: true, info: true, filters: ['--all'] }, ['ticket', 'list', '--json', '-p', 'ABC', '--limit', '2', '--offset', '0', '--files', '--info', '--', '--all']],
    ['mdt_ticket_list', { all: true }, ['ticket', 'list', '--json', '--all']],
    ['mdt_ticket_create', { title: '--force', type: 'Bug/high', slug: 'fix-login', content: '# Body\n' }, ['ticket', 'create', '--json', '--stdin', '--', 'Bug/high', '--force', 'fix-login']],
    ['mdt_ticket_attr', { key: 'ABC-1', attrs: ['--json'] }, ['ticket', 'attr', '--json', '--', 'ABC-1', '--json']],
    ['mdt_ticket_deps', { key: '--check', check: true }, ['ticket', 'deps', '--json', '--check', '--', '--check']],
    ['mdt_ticket_delete', { key: '--force', force: true }, ['ticket', 'delete', '--json', '--force', '--', '--force']],
    ['mdt_ticket_rename', { key: 'ABC-1', title: '--json', slug: 'new-title' }, ['ticket', 'rename', '--', 'ABC-1', '--json', 'new-title']],
    ['mdt_project_get', { code: '--help' }, ['project', 'get', '--json', '--', '--help']],
    ['mdt_project_init', { code: 'TMP', name: '--json', dir: 'child', ticketsPath: 'tickets' }, ['project', 'init', '--json', '--dir', 'child', '--tickets-path', 'tickets', '--', 'TMP', '--json']],
  ]
  for (const [name, args, expected] of cases) {
    test(`${name}: exact flags and protected positional boundary ${JSON.stringify(args)}`, () => {
      expect(definition(name).argv(args)).toEqual(expected)
    })
  }

  test('delete and rename schemas do not advertise unsupported project/JSON overrides', () => {
    for (const name of ['mdt_ticket_delete', 'mdt_ticket_rename']) {
      const properties = definition(name).params.properties
      expect(properties).not.toHaveProperty('project')
      expect(properties).not.toHaveProperty('json')
    }
    expect(definition('mdt_ticket_rename').description).toMatch(/text/i)
    expect(definition('mdt_ticket_delete').description).toMatch(/cwd|current.*project/i)
  })

  test('content is carried separately from argv, including empty supplied content', () => {
    const tool = definition('mdt_ticket_create') as ReturnType<typeof definition> & { stdin?: (args: Record<string, unknown>) => string | undefined }
    expect(typeof tool.stdin).toBe('function')
    expect(tool.stdin!({ title: 'Example', content: 'private body\n' })).toBe('private body\n')
    expect(tool.stdin!({ title: 'Example', content: '' })).toBe('')
    expect(tool.stdin!({ title: 'Example' })).toBeUndefined()
    expect(tool.argv({ title: 'Example', content: '' })).toContain('--stdin')
    expect(tool.argv({ title: 'Example', content: 'private body\n' })).not.toContain('private body\n')
  })
})

describe('MDT-262 current spec-trace grammar', () => {
  test('delete is top-level, supports dry-run, and retains idempotent JSON contract', () => {
    expect(definition('spec_trace_delete').argv({ entity: 'requirement', ticket: 'TMP-1', id: 'BR-1', dryRun: true }))
      .toEqual(['delete', 'requirement', 'TMP-1', 'BR-1', '--if-exists', '--format', 'json', '--dry-run'])
    expect(definition('spec_trace_delete').argv({ entity: 'task', ticket: 'TMP-1', id: 'TASK-1' }))
      .toEqual(['delete', 'task', 'TMP-1', 'TASK-1', '--if-exists', '--format', 'json'])
  })

  test('lock and render expose the remaining operational flags', () => {
    expect(definition('spec_trace_lock_requirements').argv({ ticket: 'TMP-1' })).toEqual(['lock', 'requirements', 'TMP-1'])
    expect(definition('spec_trace_render').argv({ stage: 'all', ticket: 'TMP-1', noCrossLinks: true }))
      .toEqual(['render', 'all', 'TMP-1', '--no-cross-links'])
    expect(definition('spec_trace_validate').argv({ ticket: 'TMP-1', stage: 'all', strict: true }))
      .toEqual(['validate', 'TMP-1', '--stage', 'all', '--format', 'json', '--strict'])
    expect(definition('spec_trace_bundle').argv({ ticket: 'TMP-1', taskId: 'TASK-1', format: 'json', profile: 'audit', out: 'bundle.json' }))
      .toEqual(['bundle', 'task', 'TMP-1', 'TASK-1', '--format', 'json', '--profile', 'audit', '--out', 'bundle.json'])
  })

  for (const [entity, flags, tokens] of [
    ['requirement', { kind: 'behavior', route: 'bdd', text: 'Behavior', sourceRef: 'req.md', tags: ['one', 'two'] }, ['--kind', 'behavior', '--route', 'bdd', '--text', 'Behavior', '--source-ref', 'req.md', '--tags', 'one,two']],
    ['scenario', { title: 'Scenario', covers: ['BR-1'], given: 'Given', when: 'When', then: 'Then' }, ['--title', 'Scenario', '--covers', 'BR-1', '--given', 'Given', '--when', 'When', '--then', 'Then']],
    ['artifact', { path: 'src/tool.ts', kind: 'runtime' }, ['--path', 'src/tool.ts', '--kind', 'runtime']],
    ['obligation', { title: 'Constraint', derivedFrom: ['BR-1'], artifacts: ['ART-1'] }, ['--title', 'Constraint', '--derived-from', 'BR-1', '--artifacts', 'ART-1']],
    ['test-plan', { kind: 'unit', title: 'Test', covers: ['BR-1'], file: 'tool.test.ts' }, ['--kind', 'unit', '--title', 'Test', '--covers', 'BR-1', '--file', 'tool.test.ts']],
    ['task', { title: 'Implement', owns: ['ART-1'], makesGreen: ['TEST-1'], skills: ['mdt', 'test'] }, ['--title', 'Implement', '--owns', 'ART-1', '--makes-green', 'TEST-1', '--skills', 'mdt,test']],
  ] as const) {
    test(`${entity} flags retain the binary's camelCase-to-kebab/list grammar`, () => {
      expect(definition('spec_trace_upsert').argv({ entity, ticket: 'TMP-1', id: 'ID-1', flags }))
        .toEqual([entity, 'upsert', 'TMP-1', 'ID-1', ...tokens])
      expect(definition('spec_trace_list').argv({ entity, ticket: 'TMP-1' })).toEqual([entity, 'list', 'TMP-1'])
    })
  }

  test('BB ships the canonical spec-trace definitions without drift', () => {
    expect(readFileSync(new URL('../bb/lib/spec-trace-tools.js', import.meta.url), 'utf8'))
      .toBe(readFileSync(new URL('../_lib/spec-trace-tools.js', import.meta.url), 'utf8'))
  })
})

// Offline DSH only: these fakes implement shell.resolve/execute/result, with no host reload.
function dshHarness(apply: (ctx: any) => void, result = { exitCode: 0, stdout: { text: 'OK' }, stderr: { text: '' } }) {
  const tools: any[] = []
  const specs: any[] = []
  apply({
    get: (name: string) => ({
      tools: { register: (tool: unknown) => tools.push(tool) },
      shell: { resolve: (spec: unknown) => {
        specs.push(spec)
        return spec
      }, execute: async () => ({ result: async () => result }) },
    })[name],
    effect: (fn: () => unknown) => fn(),
  })
  return { tools, specs, get: (name: string) => {
    const tool = tools.find(t => t.name === name)
    expect(tool, `DSH registration: ${name}`).toBeDefined()
    return tool
  } }
}

describe('MDT-262 DSH offline parity', () => {
  test('both adapters register the full canonical schemas', () => {
    for (const [apply, names, definitions] of [[applyMdt, MDT_NAMES, MDT_TOOLS], [applySpecTrace, TRACE_NAMES, SPEC_TRACE_TOOLS]] as const) {
      const h = dshHarness(apply)
      expect(h.tools.map(t => t.name).sort()).toEqual([...names].sort())
      for (const definition of definitions) {
        expect(h.get(definition.name).parameters.properties).toEqual(definition.params.properties)
      }
    }
  })

  test('create content is stdin data and shell metacharacters stay literal', async () => {
    const h = dshHarness(applyMdt)
    const content = '$(touch NEVER)\nquote\'s body\n'
    await h.get('mdt_ticket_create').execute({ title: 'Literal title', content }, { agent: { session: { header: { cwd: '/session/work' } } } })
    const spec = h.specs[0]
    expect(spec.workdir).toBe('/session/work')
    // stdin must use the shell service data channel or a safely quoted pipe, never interpolation.
    expect(spec.stdin === content || spec.command.includes(quote(content))).toBe(true)
    expect(spec.command).toContain('\'--stdin\'')
  })

  test('delete uses real spec-trace grammar through quoted shell adapter', async () => {
    const previous = process.env.SPEC_TRACE_BIN
    process.env.SPEC_TRACE_BIN = '/fixture/spec-trace'
    try {
      const h = dshHarness(applySpecTrace)
      await h.get('spec_trace_delete').execute({ entity: 'task', ticket: 'TMP-1', id: 'TASK-1', dryRun: true, workdir: '/work' }, {})
      expect(h.specs[0].command).toBe(['/fixture/spec-trace', 'delete', 'task', 'TMP-1', 'TASK-1', '--if-exists', '--format', 'json', '--dry-run'].map(quote).join(' '))
      expect(h.specs[0].workdir).toBe('/work')
    }
    finally {
      if (previous === undefined)
        delete process.env.SPEC_TRACE_BIN
      else process.env.SPEC_TRACE_BIN = previous
    }
  })
})

describe('MDT-262 discoverable plugin documentation', () => {
  test('coverage matrix names every native tool and explains cloud/fragment exclusions', () => {
    const matrix = readFileSync(new URL('../docs/coverage.md', import.meta.url), 'utf8')
    for (const name of [...MDT_NAMES, ...TRACE_NAMES]) expect(matrix).toContain(name)
    expect(matrix).toMatch(/cloud/i)
    expect(matrix).toMatch(/fragment/i)
  })

  test('plugin entry point links to coverage and usage with valid local links', () => {
    const entry = new URL('../README.md', import.meta.url)
    const markdown = readFileSync(entry, 'utf8')
    expect(markdown).toContain('docs/coverage.md')
    expect(markdown).toContain('docs/usage.md')
    for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      const target = match[1]
      if (/^[a-z]+:|^#/.test(target))
        continue
      expect(existsSync(resolve(dirname(entry.pathname), target)), `broken README link: ${target}`).toBe(true)
    }
  })

  test('native skill covers trace tools and keeps cloud in CLI', () => {
    const skill = readFileSync(new URL('../bb/skills/mdt-tools/SKILL.md', import.meta.url), 'utf8')
    expect(skill).toContain('spec_trace_')
    expect(skill).toMatch(/cloud[\s\S]*CLI|CLI[\s\S]*cloud/i)
    expect(skill).not.toContain('not registered by this plugin yet')
  })
})
