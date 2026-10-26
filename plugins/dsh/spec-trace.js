/**
 * spec-trace as DeepSeek Harness model tools.
 *
 * Thin glue over the compiled spec-trace CLI (SPEC_TRACE_BIN) through the
 * DSH `shell` service. The tool surface and flag mapping live in ../_lib/
 * so the bb plugin can share them (docs/CRs/MDT-262); this file owns only
 * the DSH parts: Cordis registration, command-string quoting, session
 * sandbox policy and workdir (via ./lib/kit.js). Publishes no Cordis
 * service; mounts loose in an agent preset. See ./AGENTS.md.
 */

import process from 'node:process'

import { runCli, specTraceErrorDetail } from '../_lib/run-cli.js'
import { SPEC_TRACE_TOOLS } from '../_lib/spec-trace-tools.js'
import { objectSchema, quote, render, runSubprocess, sessionPolicy } from './lib/kit.js'

export const name = 'spec-trace'
export const inject = ['tools', 'shell']

export function apply(ctx) {
  const shell = ctx.get('shell')
  const tools = ctx.get('tools')
  if (shell === undefined || tools === undefined) {
    console.error('spec-trace plugin: shell or tools service unavailable')
    return
  }

  const sandboxPolicy = ctx.get('sandboxPolicy')

  function register(definition) {
    ctx.effect(() => tools.register(definition))
  }

  /** Per-call session sandbox policy (spec-trace never overrides workdir). */
  function sessionPolicyFor(exec) {
    return { policy: sessionPolicy(sandboxPolicy, exec) }
  }

  for (const tool of SPEC_TRACE_TOOLS) {
    register({
      name: tool.name,
      description: tool.description,
      parameters: objectSchema(tool.params.properties, tool.params.required),
      output: { schema: { type: 'string' }, render },
      async execute(args, exec) {
        // Resolved at call time, not module load: the env may be provided by
        // the preset's shell-env contributor after the host process starts.
        const specTraceBin = process.env.SPEC_TRACE_BIN
        if (!specTraceBin) {
          throw new Error('SPEC_TRACE_BIN is not set; point it at the compiled spec-trace binary.')
        }
        // Per-call: resolve the session's sandbox policy (workdir is the
        // tool's own `workdir` param only — the pre-_lib contract; the shell
        // service default applies when it is omitted).
        const { policy } = sessionPolicyFor(exec)
        const runArgs = tool.argv(args)
        return runCli(
          async ({ argv, workdir: wd, timeoutMs }) => {
            const result = await runSubprocess(shell, {
              command: argv.map(quote).join(' '),
              ...(wd !== undefined ? { workdir: wd } : {}),
              timeoutMs,
              ...(policy !== undefined ? { sandboxPolicy: policy } : {}),
            })
            return {
              exitCode: result.exitCode,
              stdout: result.stdout.text,
              stderr: result.stderr.text,
            }
          },
          {
            bin: specTraceBin,
            args: runArgs,
            workdir: args.workdir,
            timeoutMs: 60000,
            errorDetail: specTraceErrorDetail,
            // spec-trace success contract: stdout, falling back to stderr.
            successText: result => (result.stdout !== '' ? result.stdout : result.stderr),
          },
        )
      },
    })
  }
}
