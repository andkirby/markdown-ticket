import { describe, expect, test } from 'bun:test'

import { resolveWorkspace } from '../_lib/bb-workspace.js'

const SERVER_HOST = 'host_server'

/** Fake bb plugin API: only bb.sdk.{status,threads,environments,projects}. */
function makeBb({
  primaryHostId = SERVER_HOST,
  thread = {},
  environment = null,
  project = null,
} = {}) {
  return {
    sdk: {
      system: { config: async () => ({ primaryHostId }) },
      threads: { get: async () => thread },
      environments: {
        get: async () => {
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
  }
}

const ENV = (path, hostId = SERVER_HOST) => ({ path, hostId })
const PROJECT = sources => ({ sources })

describe('bb workspace resolution (fail-closed contract)', () => {
  test('thread environment path on the server host wins', async () => {
    const bb = makeBb({ thread: { environmentId: 'env_1' }, environment: ENV('/ws/env') })
    const ws = await resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })
    expect(ws).toEqual({ cwd: '/ws/env', hostId: SERVER_HOST })
  })

  test('environment with null path fails — no fallback to project', async () => {
    const bb = makeBb({
      thread: { environmentId: 'env_1' },
      environment: ENV(null),
      project: PROJECT([]),
    })
    expect(resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })).rejects.toThrow(
      /no usable workspace path/,
    )
  })

  test('environment on a remote host fails with a clear error', async () => {
    const bb = makeBb({
      thread: { environmentId: 'env_1' },
      environment: ENV('/remote/ws', 'host_remote'),
    })
    expect(resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })).rejects.toThrow(
      /lives on host host_remote/,
    )
  })

  test('no environment attached: project default local_path source is used', async () => {
    const bb = makeBb({
      thread: { environmentId: null },
      project: PROJECT([
        { type: 'local_path', path: '/ws/other', hostId: SERVER_HOST, isDefault: false },
        { type: 'local_path', path: '/ws/default', hostId: SERVER_HOST, isDefault: true },
      ]),
    })
    const ws = await resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })
    expect(ws.cwd).toBe('/ws/default')
  })

  test('no environment and no usable source fails clearly', async () => {
    const bb = makeBb({ thread: {}, project: PROJECT([]) })
    expect(resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })).rejects.toThrow(
      /no local-path source/,
    )
  })

  test('non-default-only source fails — no arbitrary fallback', async () => {
    const bb = makeBb({
      thread: {},
      project: PROJECT([
        { type: 'local_path', path: '/ws/non-default', hostId: SERVER_HOST, isDefault: false },
      ]),
    })
    expect(resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })).rejects.toThrow(
      /no local-path source/,
    )
  })

  test('unknown primary host fails before any resolution', async () => {
    const bb = makeBb({ primaryHostId: null })
    expect(resolveWorkspace(bb, { threadId: 't1', projectId: 'p1' })).rejects.toThrow(
      /primary host is unknown/,
    )
  })
})
