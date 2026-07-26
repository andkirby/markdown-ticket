/**
 * TTY-aware confirmation for destructive cloud commands
 * (MDT-202 TASK-3 / ART-cli-cloud-confirm).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Non-Interactive Safety (Edge-5),
 *         BR-5.3.
 *
 * Rules:
 *   - `--yes` skips the prompt entirely.
 *   - Interactive (stdin is a TTY): prompt and read one line; confirm only on
 *     explicit yes/`y`/`yes` (case-insensitive).
 *   - Non-interactive and no `--yes`: throw `CONFIRMATION_REQUIRED` so the
 *     wrapper exits 12 instead of hanging (Edge-5).
 *
 * The confirmation never hangs waiting for input in a non-interactive session.
 */

import { Buffer } from 'node:buffer'
import process from 'node:process'
import { CloudCommandError, CloudExitCode } from './exit-codes.js'

interface ConfirmOptions {
  /** Skips the prompt when true (`--yes`). */
  yes?: boolean
  /**
   * Override TTY detection for tests. When undefined, confirmation requires
   * BOTH stdin and stdout to be TTYs (so a piped stdin or redirected stdout
   * is treated as non-interactive).
   */
  isInteractive?: boolean
  /** Inject a stdin line reader for tests. */
  readLine?: () => Promise<string | null>
  /** Inject a prompt writer for tests. */
  writePrompt?: (message: string) => void
}

/**
 * Confirm a destructive operation. Throws `CONFIRMATION_REQUIRED` when the
 * session is non-interactive and `--yes` was not supplied.
 */
export async function confirmDestructive(message: string, opts: ConfirmOptions = {}): Promise<void> {
  if (opts.yes) {
    return
  }
  const interactive = opts.isInteractive ?? isInteractive()
  if (!interactive) {
    throw new CloudCommandError(
      'CONFIRMATION_REQUIRED',
      `${message} (supply --yes to confirm non-interactively)`,
      CloudExitCode.CONFIRMATION_REQUIRED,
    )
  }
  const write = opts.writePrompt ?? defaultWritePrompt
  const read = opts.readLine ?? defaultReadLine
  write(`${message} [y/N]: `)
  const answer = (await read())?.trim().toLowerCase()
  if (answer !== 'y' && answer !== 'yes') {
    throw new CloudCommandError(
      'CONFIRMATION_DECLINED',
      'confirmation declined; no changes made',
      CloudExitCode.CLI_ERROR,
    )
  }
}

/** True only when both stdin and stdout are TTYs (a real interactive session). */
function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY)
}

function defaultWritePrompt(message: string): void {
  process.stdout.write(message)
}

function defaultReadLine(): Promise<string | null> {
  return new Promise((resolve) => {
    let data = ''
    const onData = (chunk: Uint8Array | string): void => {
      data += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()
      if (data.includes('\n')) {
        process.stdin.removeListener('data', onData)
        process.stdin.pause()
        resolve(data)
      }
    }
    process.stdin.resume()
    process.stdin.once('data', onData)
  })
}
