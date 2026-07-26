/**
 * Hidden secret reader for `cloud credentials install`
 * (MDT-202 TASK-3 / ART-cli-cloud-secret).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Redaction (C-6), BR-3.1.
 *
 * The client secret is NEVER accepted as an argv value. It is read from:
 *   - stdin when stdin is not a TTY (pipes, redirects, automation); or
 *   - a hidden interactive prompt when stdin is a TTY.
 *
 * An empty or whitespace-only secret fails closed (Edge-8): the credential
 * file is never created with a partial secret.
 *
 * The returned secret lives only in the caller's local variable and is passed
 * straight to `MachineCredentialStore.install`. It is never printed, logged,
 * or written anywhere outside the owner-only credential store.
 */

import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { CloudCommandError, CloudExitCode } from './exit-codes.js'

interface SecretPromptOptions {
  /** Override TTY detection for tests. */
  isInteractive?: boolean
  /** Inject a stdin reader for tests. */
  readAll?: () => Promise<string>
  /** Inject a hidden prompt reader for tests. */
  readHidden?: (prompt: string) => Promise<string>
}

/**
 * Read the client secret. Throws `SECRET_REQUIRED` on empty/whitespace input.
 */
export async function readClientSecret(opts: SecretPromptOptions = {}): Promise<string> {
  const interactive = opts.isInteractive ?? Boolean(process.stdin.isTTY)
  let raw: string
  if (interactive) {
    const readHidden = opts.readHidden ?? defaultReadHidden
    raw = await readHidden('Client secret: ')
  }
  else {
    const readAll = opts.readAll ?? defaultReadAllStdin
    raw = await readAll()
  }
  const secret = raw.trim()
  if (secret.length === 0) {
    throw new CloudCommandError(
      'SECRET_REQUIRED',
      'client secret is required; provide it via stdin or the hidden prompt (never argv)',
      CloudExitCode.CONFIG_INVALID,
    )
  }
  return secret
}

async function defaultReadAllStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk.toString()
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.resume()
  })
}

async function defaultReadHidden(_prompt: string): Promise<string> {
  process.stdout.write(_prompt)
  const mutedOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback()
    },
  })
  const rl = createInterface({
    input: process.stdin,
    output: mutedOutput,
    terminal: true,
  })
  try {
    const answer = await rl.question('')
    process.stdout.write('\n')
    return answer
  }
  finally {
    rl.close()
  }
}
