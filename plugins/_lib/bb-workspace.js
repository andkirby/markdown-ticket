/**
 * bb-side workspace resolution for the mdt tools (docs/CRs/MDT-262).
 *
 * bb tool `execute` receives { threadId, projectId, signal } — no cwd. This
 * resolves the workspace the calling thread runs in, fail-closed:
 *
 *   1. thread's environment, when attached: require non-null `path` and a
 *      host equal to the server's primary host (bb spawns locally, so a
 *      remote-host workspace can never be used).
 *   2. only when NO environment is attached: the project's default
 *      `local_path` source.
 *
 * Never a silent fallback: an environment lookup failure or remote-host
 * rejection is a hard error naming what was rejected.
 */

/**
 * resolveWorkspace(bb, { threadId, projectId }, { signal }) -> { cwd, hostId }
 * `bb` is the plugin API (bb.sdk.*); throws Error with a model-readable
 * message when no usable local workspace exists.
 */
export async function resolveWorkspace(bb, { threadId, projectId }, { signal } = {}) {
  // primaryHostId lives on the system config response (SDK 0.6.49), NOT on
  // status.get() — status carries only thread/project summaries.
  const config = await bb.sdk.system.config({ signal })
  const primaryHostId = config?.primaryHostId ?? null
  if (!primaryHostId) {
    throw new Error('mdt tools: server primary host is unknown; cannot run mdt-cli locally.')
  }

  const thread = await bb.sdk.threads.get({ threadId, signal })
  const environmentId = thread?.environmentId ?? null

  if (environmentId !== null && environmentId !== undefined) {
    const env = await bb.sdk.environments.get({ environmentId, signal })
    if (env.path === null || env.path === '') {
      throw new Error(
        `mdt tools: thread environment ${environmentId} has no usable workspace path.`,
      )
    }
    if (env.hostId !== primaryHostId) {
      throw new Error(
        `mdt tools: thread workspace ${env.path} lives on host ${env.hostId}, `
        + `but mdt-cli runs on the server host (${primaryHostId}). `
        + 'Run mdt-cli inside that environment instead.',
      )
    }
    return { cwd: env.path, hostId: env.hostId }
  }

  const project = await bb.sdk.projects.get({ projectId, signal })
  // Contract: the DEFAULT local_path source, or a clear error — no arbitrary
  // fallback to a non-default source.
  const source = (project.sources ?? []).find(
    s => s.type === 'local_path' && s.isDefault,
  )
  if (!source || source.path === '') {
    throw new Error(
      `mdt tools: project ${projectId} has no local-path source; cannot run mdt-cli.`,
    )
  }
  if (source.hostId !== primaryHostId) {
    throw new Error(
      `mdt tools: project workspace ${source.path} lives on host ${source.hostId}, `
      + `but mdt-cli runs on the server host (${primaryHostId}).`,
    )
  }
  return { cwd: source.path, hostId: source.hostId }
}
