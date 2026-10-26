import type { BbPluginApi } from '@get-bb/plugin-sdk'
// bb-plugin-mdt — mdt-cli as native bb agent tools (docs/CRs/MDT-262).
//
// The tool surface, argv mapping, and error extraction live in the shared
// lib (synced copy in ./lib/ — edit plugins/_lib/ and re-copy; drift is
// enforced by plugins/tests/lib-sync.test.ts). This file owns only the bb
// parts: validated schema registration, workspace resolution, and the
// spawn adapter.
//
// Subprocess contract: arg-array spawn (no shell), optional explicit stdin, 30s MDT / 60s trace
// timeout, cancellation forwarded from ctx.signal, 256 KiB COMBINED output
// cap counted in bytes WHILE streaming (the child is killed on overflow) —
// never silently truncated. Non-zero exit → thrown error (tool error).
//
// Runtime note: tool execute runs in a harness WITHOUT the Bun global
// (verified live) — use node:child_process / node:fs only.
import type { Buffer } from 'node:buffer'
import type { Readable } from 'node:stream'
import { spawn } from 'node:child_process'
import { accessSync, constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { z } from 'zod'
import { resolveWorkspace } from './lib/bb-workspace.js'
import { MDT_TOOLS } from './lib/mdt-tools.js'
import { mdtErrorDetail, specTraceErrorDetail } from './lib/run-cli.js'
import { SPEC_TRACE_TOOLS } from './lib/spec-trace-tools.js'

const OUTPUT_LIMIT_BYTES = 256 * 1024
export { OUTPUT_LIMIT_BYTES }
const TIMEOUT_MS = 30_000

/** Minimal PATH walk (no Bun.which / no npm dep — the tool harness is node). */
function defaultWhich(name: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(':')) {
    if (!dir)
      continue
    const candidate = join(dir, name)
    try {
      accessSync(candidate, fsConstants.X_OK)
      return candidate
    }
    catch {
      // keep walking
    }
  }
  return null
}

/**
 * Resolve the mdt-cli binary at call time — never a hardcoded path.
 * Order: MDT_CLI_BIN env → cliPath setting → PATH walk. The bb daemon's
 * PATH can be minimal (e.g. launched from Finder), so the setting is the
 * reliable override.
 */
export function resolveCliBin(
  which: (name: string) => string | null = defaultWhich,
  cliPath?: string,
): string {
  const bin = process.env.MDT_CLI_BIN || cliPath || which('mdt-cli')
  if (!bin) {
    throw new Error(
      'mdt-cli not found: set MDT_CLI_BIN, the plugin\'s cliPath setting '
      + '(Settings → Installed plugins → MDT), or install mdt-cli on the bb server host\'s PATH.',
    )
  }
  return bin
}

/**
 * Stream one pipe into a string while counting bytes against a shared
 * budget. On the first byte beyond the budget: flips budget.overflowed and
 * calls onOverflow (kills the child immediately — even if the OTHER stream
 * is still open and silent) so Promise.all below never waits on it.
 */
async function pipeBounded(
  stream: Readable,
  budget: { left: number, overflowed: boolean },
  onOverflow: () => void,
): Promise<string> {
  const decoder = new StringDecoder('utf8')
  let text = ''
  try {
    for await (const chunk of stream) {
      const buf = chunk as Buffer
      if (buf.byteLength > budget.left) {
        if (!budget.overflowed) {
          budget.overflowed = true
          onOverflow()
        }
        continue // drain without buffering
      }
      budget.left -= buf.byteLength
      text += decoder.write(buf)
    }
  }
  catch {
    // stream tore down (kill/abort); we throw via overflowed
  }
  text += decoder.end()
  return text
}

/**
 * Child PATH for spawned CLIs. The bb daemon can run with a minimal or
 * broken PATH (observed: `PATH=/Applications/LLM`), which breaks both
 * `#!/usr/bin/env bun` shebangs (mdt-cli) and PATH walks. Append the
 * standard tool locations; dedupe is unnecessary (first hit wins).
 */
export function augmentedPath(): string {
  const extra = [
    join(homedir(), '.bun', 'bin'),
    join(homedir(), 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
  ]
  return [process.env.PATH ?? '', ...extra].filter(Boolean).join(':')
}

/** Spawn one CLI at cwd with a combined output budget and cancellable optional stdin. */
async function runProcess(
  bin: string,
  args: string[],
  cwd: string,
  signal: AbortSignal,
  { stdin, trace = false }: { stdin?: string, trace?: boolean } = {},
): Promise<string> {
  const proc = spawn(bin, args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    signal: AbortSignal.any([signal, AbortSignal.timeout(trace ? 60_000 : TIMEOUT_MS)]),
    env: { ...process.env, PATH: augmentedPath() },
  })
  const budget = { left: OUTPUT_LIMIT_BYTES, overflowed: false }
  // Attach BEFORE reading: 'close' can fire while the pipes are draining.
  const exited = new Promise<number>((resolve, reject) => {
    proc.once('close', code => resolve(code ?? -1))
    proc.once('error', reject)
  })
  // Pipe explicit content only. Closing stdin otherwise prevents interactive prompts.
  proc.stdin.on('error', () => { /* early CLI rejection can close stdin */ })
  proc.stdin.end(stdin)
  const [stdout, stderr, exitCode] = await Promise.all([
    pipeBounded(proc.stdout, budget, () => proc.kill()),
    pipeBounded(proc.stderr, budget, () => proc.kill()),
    exited,
  ])
  if (budget.overflowed) {
    const guidance = trace ? 'reduce the requested trace output.' : 'narrow the query (filters, --limit).'
    throw new Error(
      `${trace ? 'spec-trace' : 'mdt-cli'} output exceeds ${OUTPUT_LIMIT_BYTES} bytes; ${guidance}`,
    )
  }
  if (exitCode !== 0) {
    const detail = trace ? specTraceErrorDetail({ stdout, stderr }) : mdtErrorDetail({ stdout, stderr })
    throw new Error(`${bin} exited ${exitCode}: ${detail}`)
  }
  return trace && stdout === '' ? stderr : stdout
}

/** Resolve trace binary per call, independently from mdt-cli. */
export function resolveSpecTraceBin(
  which: (name: string) => string | null = defaultWhich,
  cliPath?: string,
): string {
  const bin = process.env.SPEC_TRACE_BIN || cliPath || which('spec-trace')
  if (!bin)
    throw new Error('spec-trace not found: set SPEC_TRACE_BIN, the plugin specTracePath setting, or install spec-trace on PATH.')
  return bin
}

export async function runMdt(
  args: string[],
  cwd: string,
  signal: AbortSignal,
  { cliPath, stdin }: { cliPath?: string, stdin?: string } = {},
): Promise<string> {
  return runProcess(resolveCliBin(defaultWhich, cliPath), args, cwd, signal, { stdin })
}

export async function runSpecTrace(
  args: string[],
  cwd: string,
  signal: AbortSignal,
  { cliPath }: { cliPath?: string } = {},
): Promise<string> {
  return runProcess(resolveSpecTraceBin(defaultWhich, cliPath), args, cwd, signal, { trace: true })
}

type ToolParams = Record<string, unknown>
type Runner = (args: string[], cwd: string, signal: AbortSignal, options?: { stdin?: string }) => Promise<string>

// One schema source: convert canonical JSON Schema to validated Zod parameters.
// Plain JSON Schema registration alone would pass raw unknown values to execute.
function parameters(tool: (typeof MDT_TOOLS | typeof SPEC_TRACE_TOOLS)[number]) {
  return z.fromJSONSchema({ type: 'object', additionalProperties: false, ...tool.params } as Parameters<typeof z.fromJSONSchema>[0])
}

export function registerMdtTools(bb: BbPluginApi, { run }: { run?: Runner } = {}) {
  bb.log.info('mdt tools: registering native mdt-cli tools')
  const settings = bb.settings.define({
    cliPath: { type: 'string', label: 'mdt-cli path', default: '' },
    specTracePath: { type: 'string', label: 'spec-trace path', default: '' },
  })
  const effectiveRun: Runner = run ?? (async (args, cwd, signal, options) => {
    const { cliPath } = await settings.get()
    return runMdt(args, cwd, signal, { cliPath, ...options })
  })
  for (const tool of MDT_TOOLS) {
    bb.agents.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: parameters(tool),
      async execute(raw, { threadId, projectId, signal }) {
        const params = raw as ToolParams
        const { cwd } = await resolveWorkspace(bb, { threadId, projectId }, { signal })
        const stdin = 'stdin' in tool ? tool.stdin?.(params) : undefined
        return effectiveRun(tool.argv(params), cwd, signal, stdin !== undefined ? { stdin } : undefined)
      },
    })
  }
  return settings
}

export function registerSpecTraceTools(bb: BbPluginApi, { run }: { run?: Runner } = {}): void {
  // The factory passes the shared settings-backed runner. Standalone registration
  // uses env/PATH, keeping this host adapter independently testable.
  const effectiveRun = run ?? runSpecTrace
  for (const tool of SPEC_TRACE_TOOLS) {
    bb.agents.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: parameters(tool),
      async execute(raw, { threadId, projectId, signal }) {
        const params = raw as ToolParams
        const { cwd } = await resolveWorkspace(bb, { threadId, projectId }, { signal })
        const workdir = typeof params.workdir === 'string' ? resolve(cwd, params.workdir) : cwd
        return effectiveRun(tool.argv(params), workdir, signal)
      },
    })
  }
}

export default async function plugin(bb: BbPluginApi) {
  const settings = registerMdtTools(bb)
  registerSpecTraceTools(bb, { run: async (args, cwd, signal) => {
    const values = await settings.get()
    return runSpecTrace(args, cwd, signal, { cliPath: values.specTracePath as string | undefined })
  } })
}
