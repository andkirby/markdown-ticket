import type { BbPluginApi } from '@get-bb/plugin-sdk'
// bb-plugin-mdt — mdt-cli as native bb agent tools (docs/CRs/MDT-262).
//
// The tool surface, argv mapping, and error extraction live in the shared
// lib (synced copy in ./lib/ — edit plugins/_lib/ and re-copy; drift is
// enforced by plugins/tests/lib-sync.test.ts). This file owns only the bb
// parts: tool registration, zod schemas, workspace resolution, and the
// spawn adapter.
//
// Subprocess contract: arg-array spawn (no shell), stdin ignored, 30s
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
import { join } from 'node:path'
import process from 'node:process'
import { StringDecoder } from 'node:string_decoder'
import { z } from 'zod'
import { resolveWorkspace } from './lib/bb-workspace.js'
import { MDT_TOOLS } from './lib/mdt-tools.js'
import { mdtErrorDetail } from './lib/run-cli.js'

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

/** Spawn mdt-cli with an argv array at `cwd`; bounded, cancellable, no stdin. */
export async function runMdt(
  args: string[],
  cwd: string,
  signal: AbortSignal,
  { cliPath }: { cliPath?: string } = {},
): Promise<string> {
  const bin = resolveCliBin(defaultWhich, cliPath)
  const proc = spawn(bin, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    env: { ...process.env, PATH: augmentedPath() },
  })
  const budget = { left: OUTPUT_LIMIT_BYTES, overflowed: false }
  // Attach BEFORE reading: 'close' can fire while the pipes are draining.
  const exited = new Promise<number>((resolve, reject) => {
    proc.once('close', code => resolve(code ?? -1))
    proc.once('error', reject)
  })
  const [stdout, stderr] = await Promise.all([
    pipeBounded(proc.stdout, budget, () => proc.kill()),
    pipeBounded(proc.stderr, budget, () => proc.kill()),
  ])
  if (budget.overflowed) {
    await exited
    throw new Error(
      `mdt-cli output exceeds ${OUTPUT_LIMIT_BYTES} bytes; narrow the query (filters, --limit).`,
    )
  }
  const exitCode = await exited
  if (exitCode !== 0) {
    throw new Error(`${bin} exited ${exitCode}: ${mdtErrorDetail({ stdout, stderr })}`)
  }
  return stdout
}

// Zod schemas mirror the shared lib's mdt-tools.js params (zod validated per
// call; bad model args become tool errors before any spawn).
const projectOption = { project: z.string().optional() }
const toolSchemas = {
  mdt_ticket_get: { key: z.string(), ...projectOption },
  mdt_ticket_list: { filters: z.array(z.string()).optional(), ...projectOption },
  mdt_ticket_create: {
    title: z.string(),
    type: z.string().optional(),
    slug: z.string().optional(),
    ...projectOption,
  },
  mdt_ticket_attr: { key: z.string(), attrs: z.array(z.string()), ...projectOption },
  mdt_ticket_deps: { key: z.string(), check: z.boolean().optional(), ...projectOption },
  mdt_project_current: {},
  mdt_project_list: {},
} satisfies Record<string, z.ZodRawShape>

type MdtToolParams = Record<string, unknown>

/**
 * Register the seven tools against a bb plugin API. `run` is injectable so
 * tests can execute registered tools without spawning real processes.
 */
export function registerMdtTools(
  bb: BbPluginApi,
  { run }: { run?: (args: string[], cwd: string, signal: AbortSignal) => Promise<string> } = {},
): void {
  bb.log.info('mdt tools: registering native mdt-cli tools')

  // Declared here so it renders in Settings → Installed plugins → MDT.
  const settings = bb.settings.define({
    cliPath: {
      type: 'string',
      label: 'mdt-cli path',
      default: '',
    },
  })

  // Production runner: resolves the binary per call (fresh env + setting).
  const runDefault = async (args: string[], cwd: string, signal: AbortSignal) => {
    const { cliPath } = await settings.get()
    return runMdt(args, cwd, signal, { cliPath })
  }
  const effectiveRun = run ?? runDefault

  for (const tool of MDT_TOOLS) {
    bb.agents.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: z.object(toolSchemas[tool.name as keyof typeof toolSchemas]),
      async execute(params: MdtToolParams, { threadId, projectId, signal }) {
        // Fail-closed workspace resolution: thread environment path on the
        // server host, else the project's default local-path source.
        const { cwd } = await resolveWorkspace(bb, { threadId, projectId }, { signal })
        return effectiveRun(tool.argv(params), cwd, signal)
      },
    })
  }
}

export default async function plugin(bb: BbPluginApi) {
  registerMdtTools(bb)
}
