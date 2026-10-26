/**
 * mdt-cli as DeepSeek Harness model tools.
 *
 * Thin glue over `../../cli/bin/mdt-cli --json` through the DSH `shell`
 * service. The tool surface and error extraction live in ../_lib/ so the
 * bb plugin shares them (docs/CRs/MDT-262); this file owns only the DSH
 * parts: Cordis registration, command-string quoting, session sandbox
 * policy and workdir (via ./lib/kit.js). Publishes no Cordis service;
 * mounts loose in an agent preset. See ./AGENTS.md for the mount contract.
 */

import { MDT_TOOLS } from '../_lib/mdt-tools.js'
import { mdtErrorDetail, runCli } from '../_lib/run-cli.js'
import { execContextFor, objectSchema, quote, render, runSubprocess } from './lib/kit.js'

const CLI = new URL('../../cli/bin/mdt-cli', import.meta.url).pathname

export const name = 'mdt'
export const inject = ['tools', 'shell']

export function apply(ctx) {
  const shell = ctx.get('shell')
  const tools = ctx.get('tools')
  const sandboxPolicy = ctx.get('sandboxPolicy')
  if (shell === undefined || tools === undefined) {
    console.error('mdt plugin: shell or tools service unavailable')
    return
  }

  function register(definition) {
    ctx.effect(() => tools.register(definition))
  }

  for (const tool of MDT_TOOLS) {
    register({
      name: tool.name,
      description: tool.description,
      parameters: objectSchema(tool.params.properties, tool.params.required),
      output: { schema: { type: 'string' }, render },
      async execute(args, exec) {
        // Per-call: resolve the session's sandbox policy and workdir first,
        // then bind them into the exec adapter for this single run.
        const { policy, workdir } = execContextFor(sandboxPolicy, exec)
        const runArgs = tool.argv(args)
        return runCli(
          async ({ argv, workdir: wd, timeoutMs, stdin }) => {
            const result = await runSubprocess(shell, {
              command: argv.map(quote).join(' '),
              ...(wd !== undefined ? { workdir: wd } : {}),
              timeoutMs,
              stdin,
              ...(policy !== undefined ? { sandboxPolicy: policy } : {}),
            })
            return {
              exitCode: result.exitCode,
              stdout: result.stdout.text,
              stderr: result.stderr.text,
            }
          },
          {
            bin: CLI,
            args: runArgs,
            stdin: tool.stdin?.(args),
            workdir,
            timeoutMs: 30000,
            errorDetail: mdtErrorDetail,
            // mdt contract: stdout exclusively, even when empty (the
            // pre-_lib behavior; never fall back to stderr on success).
            successText: result => result.stdout,
          },
        )
      },
    })
  }
}
