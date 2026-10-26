import type { BbPluginApi } from '@get-bb/plugin-sdk'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'

import * as server from '../server.js'

interface RegisteredTool {
  name: string
  parameters: { parse: (v: unknown) => Record<string, unknown>, safeParse: (v: unknown) => { success: boolean, data?: Record<string, unknown> } }
  execute: (params: any, ctx: any) => Promise<string>
}
type Runner = (args: string[], cwd: string, signal: AbortSignal, options?: { stdin?: string }) => Promise<string>
interface TraceApi {
  registerSpecTraceTools: (bb: BbPluginApi, options?: { run?: Runner }) => void
  runSpecTrace: Runner
  resolveSpecTraceBin: (which?: (name: string) => string | null, cliPath?: string) => string
}
const traceApi = server as unknown as TraceApi
const names = [
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
  'spec_trace_init',
  'spec_trace_upsert',
  'spec_trace_list',
  'spec_trace_delete',
  'spec_trace_validate',
  'spec_trace_render',
  'spec_trace_bundle',
  'spec_trace_lock_requirements',
]
const session = { threadId: 'thread', projectId: 'project', signal: new AbortController().signal }

function host(cwd = '/workspace/thread', hostId = 'server') {
  const registered: RegisteredTool[] = []
  const workspaceSignals: unknown[] = []
  const bb = {
    log: { info: () => {} },
    agents: { registerTool: (tool: RegisteredTool) => registered.push(tool) },
    settings: { define: () => ({ get: async () => ({ cliPath: '', specTracePath: '' }) }) },
    sdk: {
      system: { config: async ({ signal }: any) => {
        workspaceSignals.push(signal)
        return { primaryHostId: 'server' }
      } },
      threads: { get: async () => ({ environmentId: 'env' }) },
      environments: { get: async () => ({ path: cwd, hostId }) },
      projects: { get: async () => { throw new Error('must not fall back from attached environment') } },
    },
  } as unknown as BbPluginApi
  return {
    bb,
    registered,
    workspaceSignals,
    get(name: string) {
      const tool = registered.find(tool => tool.name === name)
      expect(tool, `BB registration: ${name}`).toBeDefined()
      return tool!
    },
    async call(name: string, params: Record<string, unknown>, ctx = session) {
      const tool = this.get(name)
      // Mirror BB's Zod parse-before-execute boundary, using the registered schema.
      return tool.execute(tool.parameters.parse(params), ctx)
    },
  }
}

function registerBoth(h: ReturnType<typeof host>, run: Runner) {
  server.registerMdtTools(h.bb, { run })
  expect(typeof traceApi.registerSpecTraceTools).toBe('function')
  traceApi.registerSpecTraceTools(h.bb, { run })
}

const temporary: string[] = []
const originalEnv = Object.fromEntries(['MDT_CLI_BIN', 'SPEC_TRACE_BIN', 'CONFIG_DIR'].map(key => [key, process.env[key]]))
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined)
      delete process.env[key]
    else process.env[key] = value
  }
})
function scratch() {
  const path = mkdtempSync(join(tmpdir(), 'mdt262-native-'))
  temporary.push(path)
  return realpathSync(path)
}
function executable(path: string, body: string) {
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
  return realpathSync(path)
}
const shellQuote = (value: string) => `'${value.replace(/'/g, '\'\\\'\'')}'`

describe('MDT-262 BB registration and validated model boundary', () => {
  test('default plugin factory registers all nineteen tools, without generic/cloud wrappers', async () => {
    const h = host()
    await server.default(h.bb)
    expect(h.registered.map(t => t.name).sort()).toEqual([...names].sort())
  })

  const invalid: Array<[string, Record<string, unknown>]> = [
    ['mdt_ticket_list', { limit: -1 }],
    ['mdt_ticket_list', { limit: 1.5 }],
    ['mdt_ticket_list', { offset: -1 }],
    ['mdt_ticket_list', { all: 'yes' }],
    ['mdt_ticket_list', { files: 1 }],
    ['mdt_ticket_create', { title: 'Title', content: {} }],
    ['mdt_ticket_create', { title: '--guide' }],
    ['mdt_ticket_get', { key: '--guide' }],
    ['mdt_ticket_attr', { key: 'TMP-1', attrs: [] }],
    ['mdt_ticket_delete', { key: 'TMP-1', project: 'OTHER' }],
    ['mdt_ticket_rename', { key: 'TMP-1', title: 'New', project: 'OTHER' }],
    ['mdt_project_init', { code: 'TMP' }],
    ['mdt_project_get', {}],
    ['spec_trace_list', { entity: 'cloud', ticket: 'TMP-1' }],
    ['spec_trace_validate', { ticket: 'TMP-1', stage: 'nonsense' }],
    ['spec_trace_bundle', { ticket: 'TMP-1', taskId: 'TASK-1', profile: 'shell' }],
    ['spec_trace_bundle', { ticket: 'TMP-1', taskId: 'TASK-1', format: 'yaml' }],
    ['spec_trace_delete', { entity: 'task', ticket: 'TMP-1', id: 'TASK-1', dryRun: 'true' }],
    ['spec_trace_render', { ticket: 'TMP-1', stage: 'all', noCrossLinks: 'yes' }],
    ['spec_trace_upsert', { entity: 'task', ticket: 'TMP-1', id: 'TASK-1', flags: { title: 'Task', arbitraryShell: 'x' } }],
    ['spec_trace_upsert', { entity: 'task', ticket: 'TMP-1', id: 'TASK-1', flags: { title: 'Task', skills: [42] } }],
  ]
  for (const [name, params] of invalid) {
    test(`${name} rejects invalid model input ${JSON.stringify(params)}`, () => {
      const h = host()
      // Register separately so missing trace tools do not hide MDT schema regressions.
      if (name.startsWith('spec_')) {
        expect(typeof traceApi.registerSpecTraceTools).toBe('function')
        traceApi.registerSpecTraceTools(h.bb, { run: async () => 'unused' })
      }
      else {
        server.registerMdtTools(h.bb, { run: async () => 'unused' })
      }
      expect(h.get(name).parameters.safeParse(params).success).toBe(false)
    })
  }

  test('create forwards content separately, and project init dir remains relative to thread workspace', async () => {
    const h = host()
    const calls: unknown[] = []
    server.registerMdtTools(h.bb, { run: async (...args) => {
      calls.push(args)
      return 'OK'
    } })
    await h.call('mdt_ticket_create', { title: 'Create body', content: 'Body\n' })
    await h.call('mdt_project_init', { code: 'TMP', name: 'Temporary', dir: 'child', ticketsPath: 'tickets' })
    expect(calls).toEqual([
      [['ticket', 'create', '--json', '--stdin', '--', 'Create body'], '/workspace/thread', session.signal, { stdin: 'Body\n' }],
      [['project', 'init', '--json', '--dir', 'child', '--tickets-path', 'tickets', '--', 'TMP', 'Temporary'], '/workspace/thread', session.signal, undefined],
    ])
    expect(h.workspaceSignals).toEqual([session.signal, session.signal])
  })

  test('trace workdir defaults to thread and relative overrides resolve from it, with signal preserved', async () => {
    const h = host()
    const calls: unknown[] = []
    expect(typeof traceApi.registerSpecTraceTools).toBe('function')
    traceApi.registerSpecTraceTools(h.bb, { run: async (...args) => {
      calls.push(args)
      return 'OK'
    } })
    await h.call('spec_trace_list', { entity: 'task', ticket: 'TMP-1' })
    await h.call('spec_trace_list', { entity: 'task', ticket: 'TMP-1', workdir: '../other' })
    await h.call('spec_trace_list', { entity: 'task', ticket: 'TMP-1', workdir: '/absolute' })
    expect(calls.map(call => (call as unknown[]).slice(0, 3))).toEqual([
      [['task', 'list', 'TMP-1'], '/workspace/thread', session.signal],
      [['task', 'list', 'TMP-1'], '/workspace/other', session.signal],
      [['task', 'list', 'TMP-1'], '/absolute', session.signal],
    ])
  })

  test('trace override cannot bypass remote-host workspace rejection', async () => {
    const h = host('/remote/project', 'remote')
    let runs = 0
    registerBoth(h, async () => {
      runs++
      return 'must not run'
    })
    await expect(h.call('spec_trace_init', { ticket: 'TMP-1', workdir: '/server/project' })).rejects.toThrow(/lives on host remote/)
    expect(runs).toBe(0)
  })
})

describe('MDT-262 real spawn contracts', () => {
  test('stdin bytes reach a child at cwd, without entering argv', async () => {
    const dir = scratch()
    process.env.MDT_CLI_BIN = executable(join(dir, 'capture'), 'printf "%s\\n" "$PWD" "$*"; cat')
    const body = 'Content\nsecond line\n'
    const out = await (server.runMdt as Runner)(['one', 'two'], dir, session.signal, { stdin: body })
    expect(out).toBe(`${dir}\none two\n${body}`)
  })

  test('spec-trace binary resolution is call-time env, setting, PATH, then actionable failure', () => {
    expect(typeof traceApi.resolveSpecTraceBin).toBe('function')
    delete process.env.SPEC_TRACE_BIN
    expect(traceApi.resolveSpecTraceBin(() => '/path/spec-trace')).toBe('/path/spec-trace')
    expect(traceApi.resolveSpecTraceBin(() => '/path/spec-trace', '/setting/spec-trace')).toBe('/setting/spec-trace')
    expect(() => traceApi.resolveSpecTraceBin(() => null)).toThrow(/spec-trace.*not found/i)
    process.env.SPEC_TRACE_BIN = '/env/spec-trace'
    expect(traceApi.resolveSpecTraceBin(() => null, '/setting/spec-trace')).toBe('/env/spec-trace')
  })

  test('spec-trace stdout/stderr success and failure differ from MDT JSON failure', async () => {
    const dir = scratch()
    expect(typeof traceApi.runSpecTrace).toBe('function')
    process.env.SPEC_TRACE_BIN = executable(join(dir, 'trace-ok'), 'printf "rendered docs" >&2')
    expect(await traceApi.runSpecTrace([], dir, session.signal)).toBe('rendered docs')
    process.env.SPEC_TRACE_BIN = executable(join(dir, 'trace-fail'), 'printf "partial stdout"; printf "trace failed" >&2; exit 7')
    await expect(traceApi.runSpecTrace([], dir, session.signal)).rejects.toThrow(/exited 7: trace failed/)
    process.env.MDT_CLI_BIN = executable(join(dir, 'mdt-fail'), 'printf \'{"ok":false,"error":{"code":"NO_PROJECT_CONTEXT"}}\'; printf "warning" >&2; exit 1')
    await expect(server.runMdt([], dir, session.signal)).rejects.toThrow(/exited 1: .*NO_PROJECT_CONTEXT/)
  })

  test('new trace runner keeps bounded output and cancellation', async () => {
    const dir = scratch()
    expect(typeof traceApi.runSpecTrace).toBe('function')
    process.env.SPEC_TRACE_BIN = executable(join(dir, 'flood'), 'head -c 300000 /dev/zero; exec sleep 30')
    await expect(traceApi.runSpecTrace([], dir, session.signal)).rejects.toThrow(/exceeds 262144 bytes/)
    process.env.SPEC_TRACE_BIN = executable(join(dir, 'wait'), 'exec sleep 30')
    const controller = new AbortController()
    const pending = traceApi.runSpecTrace([], dir, controller.signal)
    controller.abort()
    await expect(pending).rejects.toThrow()
  })
})

describe('MDT-262 registered tools against actual CLI binaries in isolated storage', () => {
  test('strict validation retains JSON issue details and remediation from the actual CLI', async () => {
    const dir = scratch()
    const realTrace = Bun.which('spec-trace')
    expect(realTrace).not.toBeNull()
    process.env.SPEC_TRACE_BIN = realTrace!
    const h = host(dir)
    traceApi.registerSpecTraceTools(h.bb)
    await h.call('spec_trace_init', { ticket: 'TMP-001' })
    let diagnostic = ''
    try {
      await h.call('spec_trace_validate', { ticket: 'TMP-001', stage: 'requirements', strict: true })
    }
    catch (error) {
      diagnostic = String(error)
    }
    expect(diagnostic).toContain('STRICT_BASELINE_MISSING')
    expect(diagnostic).toContain('"relatedIds"')
    expect(diagnostic).toContain('"TMP-001"')
    expect(diagnostic).toContain('"allowedFixes"')
    expect(diagnostic).toContain('lock requirements TMP-001')
    expect(diagnostic).toContain('Validation failed')
  })

  test('all nineteen native operations accept argv and preserve their actual CLI contracts', async () => {
    const dir = scratch()
    const repo = resolve(import.meta.dir, '../../..')
    const realTrace = Bun.which('spec-trace')
    expect(realTrace, 'spec-trace must be available for compatibility verification').not.toBeNull()
    process.env.CONFIG_DIR = join(dir, 'config')
    process.env.MDT_CLI_BIN = executable(join(dir, 'mdt-cli'), `exec ${shellQuote(process.execPath)} ${shellQuote(join(repo, 'cli/bin/mdt-cli'))} "$@"`)
    process.env.SPEC_TRACE_BIN = realTrace!
    const h = host(dir)
    server.registerMdtTools(h.bb)
    expect(typeof traceApi.registerSpecTraceTools).toBe('function')
    traceApi.registerSpecTraceTools(h.bb)
    const json = async (name: string, args: Record<string, unknown> = {}) => {
      const value = JSON.parse(await h.call(name, args))
      expect(value.ok).toBe(true)
      return value
    }
    mkdirSync(join(dir, 'project'))
    const initialized = await json('mdt_project_init', { code: 'TMP', name: 'Throwaway project', dir: 'project', ticketsPath: 'tickets' })
    const projectDir = join(dir, 'project')
    expect(existsSync(join(projectDir, '.mdt-config.toml'))).toBe(true)
    expect(initialized.data.project).toBeDefined()
    // A different registration context models a thread running inside the newly initialized project.
    const p = host(projectDir)
    server.registerMdtTools(p.bb)
    traceApi.registerSpecTraceTools(p.bb)
    const invoke = (name: string, args: Record<string, unknown> = {}) => p.call(name, args)
    const structured = async (name: string, args: Record<string, unknown> = {}) => {
      const result = JSON.parse(await invoke(name, args))
      expect(result.ok).toBe(true)
      return result.data
    }
    expect((await structured('mdt_project_current')).project.code).toBe('TMP')
    expect((await structured('mdt_project_get', { code: 'TMP' })).project.code).toBe('TMP')
    expect((await structured('mdt_project_list')).items).toHaveLength(1)
    const first = await structured('mdt_ticket_create', { title: 'Native coverage first', type: 'Bug/high', content: '## Body\nOriginal content.\n' })
    const key = first.ticket.key
    expect(key).toMatch(/^TMP-/)
    await structured('mdt_ticket_create', { title: 'Native coverage second', type: 'Bug/high' })
    const read = await structured('mdt_ticket_get', { key })
    expect(read.ticket.key).toBe(key)
    expect(readFileSync(read.ticket.paths.absolute, 'utf8')).toContain('Original content.')
    const page1 = await structured('mdt_ticket_list', { limit: 1, offset: 0 })
    const page2 = await structured('mdt_ticket_list', { limit: 1, offset: 1 })
    expect(page1.items).toHaveLength(1)
    expect(page2.items).toHaveLength(1)
    expect(page1.items[0].key).not.toBe(page2.items[0].key)
    expect((await structured('mdt_ticket_list', { all: true, files: true, info: true })).items).toHaveLength(2)
    await structured('mdt_ticket_attr', { key, attrs: ['status=Approved', 'priority=Low'] })
    await structured('mdt_ticket_deps', { key, check: true })
    const renamed = await invoke('mdt_ticket_rename', { key, title: 'Renamed native coverage', slug: 'renamed-native-coverage' })
    expect(renamed).toContain('Renamed native coverage')
    expect((await structured('mdt_ticket_get', { key })).ticket.title).toBe('Renamed native coverage')
    // Invalid option-like positional input must reach domain validation, not Commander/help.
    await expect(invoke('mdt_ticket_get', { key: '--force' })).rejects.toThrow()

    await invoke('spec_trace_init', { ticket: key })
    const entities: Array<[string, string, Record<string, unknown>]> = [
      ['requirement', 'BR-1', { kind: 'behavior', route: 'bdd', text: 'Native tools work' }],
      ['scenario', 'native_tool_call', { title: 'Call tool', covers: ['BR-1'], given: 'A workspace', when: 'The tool runs', then: 'The result returns' }],
      ['artifact', 'ART-1', { path: 'tool.ts', kind: 'runtime' }],
      ['obligation', 'OBL-1', { title: 'Preserve contract', derivedFrom: ['BR-1'], artifacts: ['ART-1'] }],
      ['test-plan', 'TEST-1', { kind: 'unit', title: 'Tool test', covers: ['BR-1'], file: 'tool.test.ts' }],
      ['task', 'TASK-1', { title: 'Implement tool', owns: ['ART-1'], makesGreen: ['TEST-1'], skills: ['mdt'] }],
    ]
    for (const [entity, id, flags] of entities) {
      await invoke('spec_trace_upsert', { entity, ticket: key, id, flags })
      expect(await invoke('spec_trace_list', { entity, ticket: key })).toContain(id)
    }
    const store = join(projectDir, 'tickets', '.trace', key, 'store.json')
    const beforeDelete = readFileSync(store, 'utf8')
    await invoke('spec_trace_delete', { entity: 'task', ticket: key, id: 'TASK-1', dryRun: true })
    expect(readFileSync(store, 'utf8')).toBe(beforeDelete)
    await invoke('spec_trace_lock_requirements', { ticket: key })
    const validation = JSON.parse(await invoke('spec_trace_validate', { ticket: key, stage: 'requirements', strict: true }))
    expect(validation).toBeDefined()
    await invoke('spec_trace_render', { ticket: key, stage: 'all', noCrossLinks: true })
    expect(existsSync(join(projectDir, 'tickets', key, 'requirements.trace.md'))).toBe(true)
    const bundle = await invoke('spec_trace_bundle', { ticket: key, taskId: 'TASK-1', format: 'json', profile: 'audit' })
    expect(JSON.parse(bundle)).toBeDefined()
    await invoke('spec_trace_delete', { entity: 'task', ticket: key, id: 'TASK-1' })
    expect(await invoke('spec_trace_list', { entity: 'task', ticket: key })).not.toContain('TASK-1')
    await structured('mdt_ticket_delete', { key, force: true })
    await expect(invoke('mdt_ticket_get', { key })).rejects.toThrow(/TICKET_NOT_FOUND|not found/i)
    expect(dirname(store)).toStartWith(dir)
  }, 90_000)
})
