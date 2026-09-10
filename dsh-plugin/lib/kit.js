/**
 * Shared glue for the dsh-plugin CLI tool plugins (see ../AGENTS.md).
 *
 * Owns the plumbing that is identical across plugins: shell quoting, raw
 * JSON-Schema objects, text rendering, session exec-context derivation,
 * and the shell.resolve/run skeleton. Per-plugin behavior — argv
 * construction, timeouts, and success/error mapping — stays in each
 * plugin so tool output contracts remain byte-stable.
 */

/** POSIX single-quote for one shell token. */
export function quote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'"
}

/** Full JSON-Schema object; raw registrations are not converted from shorthand. */
export function objectSchema(properties, required) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required ? { required } : []),
  }
}

/** Render a tool result as a single text block. */
export function render(_args, value) {
  return [{ type: 'text', text: String(value) }]
}

/** Resolve the calling session's live sandbox policy so subprocesses follow it. */
export function sessionPolicy(sandboxPolicy, exec) {
  if (sandboxPolicy === undefined || exec?.agent === undefined) return undefined
  return sandboxPolicy.resolve({ session: exec.agent.session })
}

/**
 * Session cwd for subprocesses (mirrors the bash tool's resolveWorkdir):
 * the sandbox policy's canonical workspace root wins, else the session
 * header cwd. Without this, CLIs run at the host cwd and walk-up project
 * detection (.mdt-config.toml) never sees the session workspace.
 */
export function sessionWorkdir(exec, policy) {
  if (policy !== undefined && policy.workspaceRoot !== undefined) return policy.workspaceRoot
  const headerCwd = exec?.agent?.session?.header?.cwd
  return typeof headerCwd === 'string' && headerCwd !== '' ? headerCwd : undefined
}

/** Per-call exec context: sandbox policy plus the session workdir. */
export function execContextFor(sandboxPolicy, exec) {
  const policy = sessionPolicy(sandboxPolicy, exec)
  return { policy, workdir: sessionWorkdir(exec, policy) }
}

/**
 * Resolve and run one CLI subprocess through the DSH shell service.
 * Returns the raw run result; the caller maps success and error semantics.
 */
export async function runSubprocess(shell, { command, workdir, timeoutMs, sandboxPolicy }) {
  const spec = shell.resolve({
    command,
    ...(workdir !== undefined ? { workdir } : {}),
    timeoutMs,
    ...(sandboxPolicy !== undefined ? { sandboxPolicy } : {}),
  })
  return shell.run(spec)
}
