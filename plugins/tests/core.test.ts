import { describe, expect, test } from 'bun:test'

import { MDT_TOOLS } from '../_lib/mdt-tools.js'
import { flagTokens, kebabFlag, mdtErrorDetail, runCli, specTraceErrorDetail, stderrDetail } from '../_lib/run-cli.js'
import { SPEC_TRACE_TOOLS } from '../_lib/spec-trace-tools.js'

/** Build args objects for argv builders (shape mirrors the declared params). */
const mdtArgs = {
  mdt_ticket_get: { key: 'MDT-042' },
  mdt_ticket_list: {},
  mdt_ticket_create: { title: 'Fix login', type: 'Bug/high', slug: 'fix-login' },
  mdt_ticket_attr: { key: 'MDT-042', attrs: ['status=Approved', 'priority=High'] },
  mdt_ticket_deps: { key: 'MDT-042', check: true },
  mdt_project_current: {},
  mdt_project_list: {},
  mdt_ticket_delete: { key: 'MDT-042' },
  mdt_ticket_rename: { key: 'MDT-042', title: 'New title' },
  mdt_project_get: { code: 'MDT' },
  mdt_project_init: { code: 'TMP', name: 'Temporary' },
}

describe('flag conversion', () => {
  test('kebabFlag converts camelCase to kebab-case CLI flags', () => {
    expect(kebabFlag('sourceRef')).toBe('--source-ref')
    expect(kebabFlag('makesGreen')).toBe('--makes-green')
    expect(kebabFlag('format')).toBe('--format')
  })

  test('flagTokens: values, bare true, omit false/null/undefined, comma-joined arrays', () => {
    expect(
      flagTokens({ a: 'x', b: 2, c: true, d: false, e: null, f: undefined, g: ['p', 'q'] }),
    ).toEqual(['--a', 'x', '--b', '2', '--c', '--g', 'p,q'])
  })

  test('flagTokens: zero and empty string are kept (only false/null/undefined omit)', () => {
    expect(flagTokens({ n: 0, s: '' })).toEqual(['--n', '0', '--s', ''])
  })
})

describe('mdt tool argv mapping (byte-stable contract)', () => {
  test('all eleven tools present with names the model depends on', () => {
    expect(MDT_TOOLS.map(t => t.name)).toEqual([
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

  test('JSON-capable commands embed --json; rename retains text; project is optional', () => {
    for (const tool of MDT_TOOLS) {
      const withProject = tool.argv({ project: 'ABC', ...mdtArgs[tool.name] })
      if (tool.name === 'mdt_ticket_rename')
        expect(withProject).not.toContain('--json')
      else expect(withProject).toContain('--json')
      const without = tool.argv(mdtArgs[tool.name])
      expect(without).not.toContain('-p')
    }
    expect(MDT_TOOLS.find(t => t.name === 'mdt_ticket_get').argv({ key: 'MDT-042' })).toEqual([
      'ticket',
      'get',
      '--json',
      '--',
      'MDT-042',
    ])
    expect(MDT_TOOLS.find(t => t.name === 'mdt_ticket_get').argv({ key: 'MDT-042', project: 'ABC' })).toEqual([
      'ticket',
      'get',
      '--json',
      '-p',
      'ABC',
      '--',
      'MDT-042',
    ])
  })

  test('optional segments drop out when unset', () => {
    expect(MDT_TOOLS.find(t => t.name === 'mdt_ticket_create').argv({ title: 'Fix login' })).toEqual([
      'ticket',
      'create',
      '--json',
      '--',
      'Fix login',
    ])
    expect(MDT_TOOLS.find(t => t.name === 'mdt_ticket_deps').argv({ key: 'MDT-1' })).toEqual([
      'ticket',
      'deps',
      '--json',
      '--',
      'MDT-1',
    ])
    expect(MDT_TOOLS.find(t => t.name === 'mdt_ticket_list').argv({ filters: ['status=Approved'] })).toEqual([
      'ticket',
      'list',
      '--json',
      '--',
      'status=Approved',
    ])
  })
})

describe('spec-trace tool argv mapping', () => {
  test('all eight tools present', () => {
    expect(SPEC_TRACE_TOOLS.map(t => t.name)).toEqual([
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

  test('workdir is never baked into argv (the host passes it separately)', () => {
    for (const tool of SPEC_TRACE_TOOLS) {
      const args = tool.argv({ workdir: '/somewhere', ticket: 'MDT-1', id: 'R-1', entity: 'requirement' })
      expect(args).not.toContain('/somewhere')
    }
  })

  test('delete keeps --if-exists --format json; validate maps strict/stage', () => {
    expect(
      SPEC_TRACE_TOOLS.find(t => t.name === 'spec_trace_delete')
        .argv({ entity: 'requirement', ticket: 'MDT-1', id: 'R-1' }),
    ).toEqual(['delete', 'requirement', 'MDT-1', 'R-1', '--if-exists', '--format', 'json'])
    expect(
      SPEC_TRACE_TOOLS.find(t => t.name === 'spec_trace_validate')
        .argv({ ticket: 'MDT-1', stage: 'bdd', strict: true }),
    ).toEqual(['validate', 'MDT-1', '--stage', 'bdd', '--format', 'json', '--strict'])
  })

  test('bundle forwards only provided flags', () => {
    expect(
      SPEC_TRACE_TOOLS.find(t => t.name === 'spec_trace_bundle')
        .argv({ ticket: 'MDT-1', taskId: 'T-2', format: 'json' }),
    ).toEqual(['bundle', 'task', 'MDT-1', 'T-2', '--format', 'json'])
  })
})

describe('per-CLI output contracts', () => {
  test('mdtErrorDetail prefers stdout (structured JSON error)', () => {
    expect(mdtErrorDetail({ stdout: '{"ok":false}', stderr: 'noise' })).toBe('{"ok":false}')
  })

  test('mdtErrorDetail filters the benign ⚠️ config warning from stderr', () => {
    const result = {
      stdout: '',
      stderr: '⚠️ cannot write ~/.config\nNO_PROJECT_CONTEXT: no .mdt-config.toml\n',
    }
    expect(mdtErrorDetail(result)).toBe('NO_PROJECT_CONTEXT: no .mdt-config.toml')
  })

  test('stderrDetail returns stderr as-is (trimmed)', () => {
    expect(stderrDetail({ stdout: '', stderr: '  boom\n' })).toBe('boom')
  })

  test('trace failures retain JSON diagnostics after the stderr summary', () => {
    const issues = '{"issues":[{"code":"STRICT_BASELINE_MISSING","guidance":{"allowedFixes":["lock requirements"]}}]}'
    expect(specTraceErrorDetail({ stdout: `${issues}\n`, stderr: 'Validation failed\n' }))
      .toBe(`Validation failed\n${issues}`)
    expect(specTraceErrorDetail({ stdout: issues, stderr: '' })).toBe(issues)
    expect(specTraceErrorDetail({ stdout: '', stderr: ' summary\n' })).toBe('summary')
  })
})

describe('runCli', () => {
  const execOk = async ({ argv, workdir, timeoutMs }) => {
    expect(argv[0]).toBe('/bin/mdt')
    expect(workdir).toBe('/ws')
    expect(timeoutMs).toBe(30000)
    return { exitCode: 0, stdout: 'OK', stderr: '' }
  }

  test('forwards argv/workdir/timeout to exec and returns success text', async () => {
    const out = await runCli(execOk, { bin: '/bin/mdt', args: ['project'], workdir: '/ws' })
    expect(out).toBe('OK')
  })

  test('non-zero exit throws with the CLI label (basename) and error detail', async () => {
    const fail = async () => ({ exitCode: 2, stdout: '', stderr: 'NO_PROJECT_CONTEXT' })
    expect(runCli(fail, { bin: '/bin/mdt-cli', args: [] })).rejects.toThrow(
      'mdt-cli exited 2: NO_PROJECT_CONTEXT',
    )
    expect(runCli(fail, { bin: '/opt/x/spec-trace', args: [] })).rejects.toThrow(
      'spec-trace exited 2: NO_PROJECT_CONTEXT',
    )
    expect(
      runCli(fail, { bin: '/bin/mdt-cli', args: [], label: 'custom', errorDetail: stderrDetail }),
    ).rejects.toThrow('custom exited 2: NO_PROJECT_CONTEXT')
  })

  test('default success is stdout only — never stderr fallback (mdt contract)', async () => {
    const empty = async () => ({ exitCode: 0, stdout: '', stderr: '⚠️ warning line' })
    const out = await runCli(empty, { bin: '/bin/mdt-cli', args: [] })
    expect(out).toBe('')
  })

  test('mdtErrorDetail keeps pre-_lib stdout contract', async () => {
    expect(mdtErrorDetail({ stdout: '  {"ok":false}  ', stderr: 'x' })).toBe('{"ok":false}')
  })
})
