import { spawn } from 'node:child_process'
/**
 * CLI Runner Helper for E2E Tests
 *
 * Provides a standardized way to execute the CLI binary in tests
 * and capture stdout, stderr, and exit codes.
 */

import { resolve } from 'node:path'
import process from 'node:process'

/**
 * Path to the CLI entry point
 */
const CLI_PATH = resolve(import.meta.dir, '../../../src/index.ts')

/**
 * Result of running the CLI
 */
export interface CliResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

/**
 * Options for running the CLI
 */
export interface CliRunOptions {
  /**
   * Current working directory for the CLI process
   */
  cwd?: string

  /**
   * Environment variables to set
   */
  env?: Record<string, string>

  /**
   * Timeout in milliseconds (default: 15000)
   */
  timeout?: number

  /**
   * Input to provide via stdin
   */
  stdin?: string
}

/**
 * Run the CLI with the given arguments
 *
 * @param args - Command-line arguments to pass to the CLI
 * @param options - Execution options
 * @returns Result with exit code, stdout, stderr, and timeout status
 */
export async function runCli(args: string[], options: CliRunOptions = {}): Promise<CliResult> {
  const {
    cwd,
    env = {},
    timeout = 15000,
    stdin: stdinContent,
  } = options

  // Set NO_COLOR=1 by default for deterministic output matching
  const cliEnv = {
    NO_COLOR: '1',
    ...env,
  }

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const child = spawn('bun', [CLI_PATH, ...args], {
      cwd,
      env: { ...process.env, ...cliEnv } as Record<string, string>,
      stdio: 'pipe',
    })

    // Set up timeout
    const timeoutId = timeout
      ? setTimeout(() => {
          timedOut = true
          child.kill('SIGTERM')
        }, timeout)
      : null

    // Collect stdout
    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    // Collect stderr
    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle exit
    child.on('exit', (code) => {
      if (timeoutId)
        clearTimeout(timeoutId)
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
      })
    })

    // Handle errors
    child.on('error', (error) => {
      if (timeoutId)
        clearTimeout(timeoutId)
      reject(error)
    })

    // Write stdin if provided, otherwise close stdin
    if (stdinContent !== undefined) {
      child.stdin?.write(stdinContent)
      child.stdin?.end()
    }
    else {
      // Close stdin immediately to prevent hanging
      child.stdin?.end()
    }
  })
}

/**
 * Run the CLI with stdin input
 *
 * @param args - Command-line arguments to pass to the CLI
 * @param stdin - Content to pipe to stdin
 * @param options - Execution options
 * @returns Result with exit code, stdout, stderr, and timeout status
 */
export async function runCliWithStdin(
  args: string[],
  stdin: string,
  options: Omit<CliRunOptions, 'stdin'> = {},
): Promise<CliResult> {
  return runCli(args, { ...options, stdin })
}
