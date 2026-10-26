import { afterEach, describe, expect, test } from 'bun:test'

// SPEC_TRACE_BIN is captured at module load — set it before the import.
process.env.SPEC_TRACE_BIN ??= '/bin/spec-trace'
const { apply: applySpecTrace } = await import('../dsh/spec-trace.js')
const { apply: applyMdt } = await import('../dsh/mdt.js')

/**
 * Fake DSH plumbing: a Cordis-style ctx with a recording `tools` registry
 * and a `shell` service whose run() returns canned results and records
 * every resolved spec. kit.js's runSubprocess passes our canned shape
 * ({ stdout: { text }, stderr: { text } }) straight through.
 */
function makeCtx(result = { exitCode: 0, stdout: { text: 'OK' }, stderr: { text: '' } }) {
  const registered = []
  const specs = []
  const deps = {
    tools: { register: def => registered.push(def) },
    shell: {
      resolve: (spec) => {
        specs.push(spec)
        return spec
      },
      // Current DSH ShellExecutor API (dsh 0.2.1-rc.3).
      execute: async () => ({ result: async () => result }),
    },
    sandboxPolicy: undefined,
  }
  return {
    ctx: { get: key => deps[key], effect: fn => fn() },
    registered,
    specs,
  }
}

const sessionExec = { agent: { session: { header: { cwd: '/session/ws' } } } }

// Same depth as plugins/dsh/*.js → resolves to the same absolute CLI path.
const CLI = new URL('../../cli/bin/mdt-cli', import.meta.url).pathname
const quotedCli = `'${CLI.replace(/'/g, '\'\\\'\'')}'`

const names = regs => regs.map(t => t.name)
const find = (regs, name) => regs.find(t => t.name === name)

describe('mdt plugin (DSH glue over _lib)', () => {
  test('registers the eleven mdt tools', () => {
    const { ctx, registered } = makeCtx()
    applyMdt(ctx)
    expect(names(registered)).toEqual([
      'mdt_ticket_get',
      'mdt_ticket_list',
      'mdt_ticket_create',
      'mdt_ticket_attr',
      'mdt_ticket_deps',
      'mdt_project_current',
      'mdt_project_list',
      'mdt_ticket_delete',
      'mdt_ticket_rename',
      'mdt_project_get',
      'mdt_project_init',
    ])
  })

  test('ticket get: quoted command string, --json, -p override, session workdir, 30s', async () => {
    const { ctx, registered, specs } = makeCtx()
    applyMdt(ctx)
    const out = await find(registered, 'mdt_ticket_get').execute(
      { key: 'MDT-0\'42', project: 'ABC' },
      sessionExec,
    )
    expect(out).toBe('OK')
    expect(specs).toHaveLength(1)
    const spec = specs[0]
    expect(spec.workdir).toBe('/session/ws')
    expect(spec.timeoutMs).toBe(30000)
    expect(spec.command).toBe(
      `${quotedCli} 'ticket' 'get' '--json' '-p' 'ABC' '--' 'MDT-0'\\''42'`,
    )
  })

  test('project_current: no -p, no workdir key when the session has no cwd', async () => {
    const { ctx, registered, specs } = makeCtx()
    applyMdt(ctx)
    await find(registered, 'mdt_project_current').execute({}, {})
    const spec = specs[0]
    expect(spec.workdir).toBeUndefined()
    expect(spec.command).toBe(`${quotedCli} 'project' '--json'`)
  })

  test('CLI failure surfaces stderr through the mdt detail strategy', async () => {
    const { ctx, registered } = makeCtx({
      exitCode: 1,
      stdout: { text: '{"ok":false,"error":{"code":"X"}}' },
      stderr: { text: '⚠️ cannot write config\nignored\n' },
    })
    applyMdt(ctx)
    const run = find(registered, 'mdt_ticket_get').execute({ key: 'MDT-1' }, sessionExec)
    expect(run).rejects.toThrow('exited 1: {"ok":false,"error":{"code":"X"}}')
  })
})

describe('spec-trace plugin (DSH glue over _lib)', () => {
  afterEach(() => {
    delete process.env.SPEC_TRACE_BIN
  })

  test('registers the eight spec-trace tools', () => {
    process.env.SPEC_TRACE_BIN = '/bin/spec-trace'
    const { ctx, registered } = makeCtx()
    applySpecTrace(ctx)
    expect(names(registered)).toEqual([
      'spec_trace_init',
      'spec_trace_upsert',
      'spec_trace_list',
      'spec_trace_delete',
      'spec_trace_validate',
      'spec_trace_render',
      'spec_trace_bundle',
      'spec_trace_lock_requirements',
    ])
  })

  test('missing SPEC_TRACE_BIN throws a clear error', async () => {
    delete process.env.SPEC_TRACE_BIN
    const { ctx, registered } = makeCtx()
    applySpecTrace(ctx)
    const run = find(registered, 'spec_trace_list').execute(
      { entity: 'requirement', ticket: 'MDT-1' },
      {},
    )
    expect(run).rejects.toThrow('SPEC_TRACE_BIN is not set')
  })

  test('workdir param forwards to the spec with 60s timeout; success falls back to stderr', async () => {
    const { ctx, registered, specs } = makeCtx({
      exitCode: 0,
      stdout: { text: '' },
      stderr: { text: 'wrote trace.md' },
    })
    process.env.SPEC_TRACE_BIN = '/bin/spec-trace'
    applySpecTrace(ctx)
    const out = await find(registered, 'spec_trace_list').execute(
      { entity: 'requirement', ticket: 'MDT-143', workdir: '/tmp/proj' },
      {},
    )
    expect(out).toBe('wrote trace.md')
    expect(specs[0].workdir).toBe('/tmp/proj')
    expect(specs[0].timeoutMs).toBe(60000)
    expect(specs[0].command).toBe('\'/bin/spec-trace\' \'requirement\' \'list\' \'MDT-143\'')
  })

  test('failed validation preserves structured remediation and summary', async () => {
    process.env.SPEC_TRACE_BIN = '/bin/spec-trace'
    const issues = '{"issues":[{"code":"STRICT_BASELINE_MISSING","guidance":{"allowedFixes":["lock requirements"]}}]}'
    const { ctx, registered } = makeCtx({
      exitCode: 1,
      stdout: { text: issues },
      stderr: { text: 'Validation failed' },
    })
    applySpecTrace(ctx)
    await expect(find(registered, 'spec_trace_validate').execute(
      { ticket: 'MDT-1', stage: 'requirements', strict: true },
      {},
    )).rejects.toThrow(`exited 1: Validation failed\n${issues}`)
  })
})
