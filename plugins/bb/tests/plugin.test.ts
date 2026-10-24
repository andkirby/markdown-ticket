import type { BbPluginApi } from '@get-bb/plugin-sdk'

import { afterAll, describe, expect, test } from 'bun:test'
// Executes the REGISTERED tools through the plugin factory with SDK-shaped
// fixtures and an injected run fn — the substitution the review required
// (the pure workspace tests alone missed the SDK mismatch).
import { augmentedPath, OUTPUT_LIMIT_BYTES, registerMdtTools, runMdt } from '../server.js'

const SERVER_HOST = 'host_server'

function makeBb({
  primaryHostId = SERVER_HOST,
  thread = {} as Record<string, unknown>,
  environment = null as Record<string, unknown> | null,
  project = null as Record<string, unknown> | null,
} = {}) {
  const registered = [] as Array<{
    name: string
    parameters: { safeParse: (v: unknown) => { success: boolean } }
    execute: (params: never, ctx: never) => Promise<string>
  }>
  let envGets = 0
  const bb = {
    log: { info: () => {} },
    agents: { registerTool: (t: never) => registered.push(t) },
    settings: { define: () => ({ get: async () => ({ cliPath: '' }) }) },
    sdk: {
      system: { config: async () => ({ primaryHostId }) },
      threads: { get: async () => thread },
      environments: {
        get: async () => {
          envGets++
          if (environment === null)
            throw new Error('unexpected environments.get')
          return environment
        },
      },
      projects: {
        get: async () => {
          if (project === null)
            throw new Error('unexpected projects.get')
          return project
        },
      },
    },
  } as unknown as BbPluginApi
  return { bb, registered, envGets: () => envGets }
}

const RUN_OK = async () => 'OK'
const ENV_OK = { path: '/ws/env', hostId: SERVER_HOST }
const SESSION = { threadId: 't1', projectId: 'p1', signal: new AbortController().signal }

function getTool(registered: ReturnType<typeof makeBb>['registered'], name: string) {
  const tool = registered.find(t => t.name === name)
  if (!tool)
    throw new Error(`tool ${name} not registered`)
  return tool
}

describe('registered bb tools', () => {
  test('registers the seven mdt tools', () => {
    const { bb, registered } = makeBb({ environment: ENV_OK })
    registerMdtTools(bb, { run: RUN_OK })
    expect(registered.map(t => t.name)).toEqual([
      'mdt_ticket_get',
      'mdt_ticket_list',
      'mdt_ticket_create',
      'mdt_ticket_attr',
      'mdt_ticket_deps',
      'mdt_project_current',
      'mdt_project_list',
    ])
  })

  test('zod schemas reject bad model args before execute', () => {
    const { bb, registered } = makeBb({ environment: ENV_OK })
    registerMdtTools(bb, { run: RUN_OK })
    expect(getTool(registered, 'mdt_ticket_get').parameters.safeParse({}).success).toBe(false)
    expect(getTool(registered, 'mdt_ticket_get').parameters.safeParse({ key: 'MDT-1' }).success).toBe(true)
    expect(getTool(registered, 'mdt_ticket_attr').parameters.safeParse({ key: 'MDT-1' }).success).toBe(false)
  })

  test('successful call resolves thread environment and forwards argv+cwd', async () => {
    const { bb, registered } = makeBb({
      thread: { environmentId: 'env_1' },
      environment: ENV_OK,
    })
    const calls: Array<{ args: string[], cwd: string }> = []
    registerMdtTools(bb, {
      run: async (args, cwd) => {
        calls.push({ args, cwd })
        return 'OK'
      },
    })
    const out = await getTool(registered, 'mdt_ticket_get').execute(
      { key: 'MDT-9', project: 'ABC' } as never,
      SESSION as never,
    )
    expect(out).toBe('OK')
    expect(calls).toEqual([{ args: ['ticket', 'get', '--json', '-p', 'ABC', 'MDT-9'], cwd: '/ws/env' }])
  })

  test('remote-host environment fails the tool without spawning', async () => {
    const { bb, registered } = makeBb({
      thread: { environmentId: 'env_1' },
      environment: { path: '/remote', hostId: 'host_remote' },
    })
    const runs: string[][] = []
    registerMdtTools(bb, {
      run: async (...a) => {
        runs.push(a[0])
        return 'should not run'
      },
    })
    expect(
      getTool(registered, 'mdt_project_current').execute({} as never, SESSION as never),
    ).rejects.toThrow(/lives on host host_remote/)
    expect(runs).toHaveLength(0)
  })
})

describe('runMdt spawn adapter (real subprocesses)', () => {
  const originalBin = process.env.MDT_CLI_BIN

  afterAll(() => {
    if (originalBin === undefined)
      delete process.env.MDT_CLI_BIN
    else process.env.MDT_CLI_BIN = originalBin
  })

  test('happy path: argv array at cwd, stdout returned', async () => {
    process.env.MDT_CLI_BIN = '/bin/echo'
    const out = await runMdt(['--json', 'hello'], '/tmp', new AbortController().signal)
    expect(out.trim()).toBe('--json hello')
  })

  test('missing binary fails with a clear error (injected which)', async () => {
    const { resolveCliBin } = await import('../server.js')
    const prev = process.env.MDT_CLI_BIN
    delete process.env.MDT_CLI_BIN
    try {
      expect(() => resolveCliBin(() => null)).toThrow(/mdt-cli not found/)
      expect(resolveCliBin(() => '/opt/bin/mdt-cli')).toBe('/opt/bin/mdt-cli')
      // cliPath setting wins over PATH walk
      expect(resolveCliBin(() => null, '/custom/mdt-cli')).toBe('/custom/mdt-cli')
    }
    finally {
      if (prev !== undefined)
        process.env.MDT_CLI_BIN = prev
    }
  })

  test('combined byte cap kills the child and errors explicitly', async () => {
    // fixture writes 300k bytes (> 256 KiB cap) to stdout and stderr
    const fixture = '/tmp/mdt-flood-fixture.sh'
    await Bun.write(
      fixture,
      `#!/bin/sh\ncat /dev/zero | tr '\\\\0' 'x' | head -c 300000\ncat /dev/zero | tr '\\\\0' 'y' | head -c 300000 1>&2\n`,
    )
    process.env.MDT_CLI_BIN = 'sh'
    try {
      const run = runMdt([fixture], '/tmp', new AbortController().signal)
      expect(run).rejects.toThrow(/exceeds 262144 bytes/)
    }
    finally {
      await Bun.write(fixture, '')
    }
  })

  test('output exactly at the limit succeeds (no off-by-one)', async () => {
    const fixture = '/tmp/mdt-exact-fixture.sh'
    await Bun.write(fixture, 'head -c 262144 /dev/zero | tr \'\\0\' x')
    process.env.MDT_CLI_BIN = 'sh'
    try {
      const out = await runMdt([fixture], '/tmp', new AbortController().signal)
      expect(out.length).toBe(262_144)
    }
    finally {
      await Bun.write(fixture, '')
    }
  })

  test('overflow kills the child promptly even when the other stream stays open', async () => {
    const fixture = '/tmp/mdt-flood-then-hang.sh'
    // flood stdout past the cap, then hold stderr open silently for 120s —
    // the pre-fix implementation waited on stderr until timeout/abort.
    await Bun.write(fixture, 'head -c 300000 /dev/zero | tr \'\\0\' x; exec sleep 120')
    process.env.MDT_CLI_BIN = 'sh'
    const started = Date.now()
    try {
      const run = runMdt([fixture], '/tmp', new AbortController().signal)
      expect(run).rejects.toThrow(/exceeds 262144 bytes/)
      expect(Date.now() - started).toBeLessThan(10_000)
    }
    finally {
      await Bun.write(fixture, '')
    }
  })

  test('child PATH is augmented with standard tool locations', () => {
    const prev = process.env.PATH
    process.env.PATH = '/Applications/LLM' // observed broken daemon PATH
    try {
      const p = augmentedPath()
      expect(p.startsWith('/Applications/LLM:')).toBe(true)
      expect(p).toContain('/.bun/bin')
      expect(p).toContain('/usr/local/bin')
      expect(p).toContain('/bin')
    }
    finally {
      process.env.PATH = prev
    }
  })

  test('output limit constant is 256 KiB', () => {
    expect(OUTPUT_LIMIT_BYTES).toBe(262_144)
  })
})
