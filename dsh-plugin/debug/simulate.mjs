/**
 * Offline DSH tool-plugin simulator (see ../DEBUG.md).
 *
 * Drives a dsh-plugin tool through fake DSH services — no host, no session,
 * no host restart needed. The subprocess runs UNSANDBOXED with this
 * process's privileges: prefer read-only tools, or point workdir at a
 * throwaway project.
 *
 * Usage:
 *   bun dsh-plugin/debug/simulate.mjs <workdir> <toolName> [jsonArgs]
 *
 * Examples:
 *   bun dsh-plugin/debug/simulate.mjs "$PWD" mdt_project_current
 *   bun dsh-plugin/debug/simulate.mjs "$PWD" mdt_ticket_list '{"filters":["status=Implemented"]}'
 */

import { spawn } from 'node:child_process'
import process from 'node:process'

const PLUGINS = [
  new URL('../mdt.js', import.meta.url).pathname,
  new URL('../spec-trace.js', import.meta.url).pathname,
]

function fakeShell() {
  return {
    resolve: spec => spec,
    run: spec => new Promise((resolve) => {
      // stdio 'ignore' for stdin: a live pipe never closing hangs CLIs
      // (e.g. mdt-cli ticket create) that poll stdin.
      const child = spawn('bash', ['-c', spec.command], {
        cwd: spec.workdir,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', d => (stdout += d))
      child.stderr.on('data', d => (stderr += d))
      child.on('close', code =>
        resolve({ exitCode: code ?? -1, stdout: { text: stdout }, stderr: { text: stderr } }))
    }),
  }
}

async function loadTools() {
  const registrations = []
  const effects = []
  const shell = fakeShell()
  const services = {
    tools: { register: definition => registrations.push(definition) },
    shell,
  }
  for (const pluginPath of PLUGINS) {
    const plugin = await import(pluginPath)
    const ctx = {
      get: name => services[name],
      effect: fn => effects.push(fn),
    }
    plugin.apply(ctx)
  }
  effects.forEach(fn => fn())
  return registrations
}

const [workdir, toolName, jsonArgs] = process.argv.slice(2)
if (workdir === undefined || toolName === undefined) {
  console.error('usage: bun dsh-plugin/debug/simulate.mjs <workdir> <toolName> [jsonArgs]')
  process.exit(2)
}

const tools = await loadTools()
const tool = tools.find(t => t.name === toolName)
if (tool === undefined) {
  console.error(`unknown tool '${toolName}'; registered: ${tools.map(t => t.name).join(', ')}`)
  process.exit(2)
}

const args = jsonArgs === undefined ? {} : JSON.parse(jsonArgs)
const exec = { agent: { session: { header: { cwd: workdir } } } }
try {
  const result = await tool.execute(args, exec)
  console.log(String(result))
}
catch (error) {
  console.error(`ERROR: ${error.message}`)
  process.exit(1)
}
