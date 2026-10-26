/**
 * Host-agnostic CLI runner shared by the mdt and spec-trace tool plugins
 * (see plugins/dsh/AGENTS.md and docs/CRs/MDT-262).
 *
 * The runner takes an injected exec function so each host keeps its own
 * subprocess mechanics: DSH runs command strings through its `shell`
 * service (quoting + sandbox policy stay host-side); bb spawns argv arrays
 * directly. Tool output contracts stay per-CLI — see the two errorDetail
 * strategies below; never collapse them into one.
 */

/**
 * Error text for a failed mdt-cli run: prefer the CLI's structured JSON
 * error on stdout (trimmed, matching the pre-_lib contract); from stderr
 * drop the benign config-dir warning (sandboxed hosts cannot write
 * ~/.config, mdt-cli continues with a fallback) so the real cause stays
 * visible instead of implicating the sandbox.
 */
export function mdtErrorDetail(result) {
  if (result.stdout.trim() !== '')
    return result.stdout.trim()
  const stderr = result.stderr
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('⚠️'))
    .join('\n')
  return stderr !== '' ? stderr : result.stderr.trim()
}

/** Error text for a CLI that reports its failure on stderr only. */
export function stderrDetail(result) {
  return result.stderr.trim()
}

/** Validation failures include structured issues and remediation on stdout. */
export function specTraceErrorDetail(result) {
  return [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n')
}

/**
 * Run one CLI subprocess through the injected exec fn and map the result.
 *
 * exec: async ({ argv, workdir, timeoutMs, stdin? }) => { exitCode, stdout, stderr }
 *   (stdout/stderr as strings; workdir may be undefined = host default)
 * opts.label: name used in error prefixes (default: basename of bin —
 *   'mdt-cli' / 'spec-trace', matching the pre-_lib error contracts).
 * opts.errorDetail: build the thrown error text from a failed result
 *   (default stderrDetail). opts.successText: extract the success payload
 *   (default stdout only — the mdt contract; spec-trace passes the
 *   stdout-then-stderr fallback itself).
 */
export async function runCli(exec, {
  bin,
  args,
  workdir,
  timeoutMs = 30000,
  label,
  stdin,
  errorDetail = stderrDetail,
  successText = result => result.stdout,
}) {
  const result = await exec({ argv: [bin, ...args], workdir, timeoutMs, ...(stdin !== undefined ? { stdin } : {}) })
  if (result.exitCode !== 0) {
    const name = label ?? bin.split('/').pop() ?? bin
    throw new Error(`${name} exited ${result.exitCode}: ${errorDetail(result)}`)
  }
  return successText(result)
}

/** camelCase flag key (e.g. sourceRef) to CLI kebab-case (e.g. --source-ref). */
export function kebabFlag(key) {
  return `--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`
}

/**
 * Map a flags object to CLI tokens. String/number values become
 * `--key value`; `true` becomes the flag alone; `false`/undefined are
 * omitted; arrays are comma-joined (the CLI's list syntax).
 */
export function flagTokens(flags) {
  const tokens = []
  for (const [key, value] of Object.entries(flags || {})) {
    if (value === undefined || value === null || value === false)
      continue
    tokens.push(kebabFlag(key))
    if (value === true)
      continue
    tokens.push(Array.isArray(value) ? value.join(',') : String(value))
  }
  return tokens
}
