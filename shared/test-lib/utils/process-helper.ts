/**
 * Process Helper Utility
 *
 * Cross-platform process spawning, monitoring, and cleanup with timeout support.
 */

import type { ChildProcess } from 'node:child_process'
import type { ServerConfig } from '../types.js'
import { exec, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { TestFrameworkError } from '../types.js'

const execAsync = promisify(exec)

export interface ProcessOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  captureOutput?: boolean
  inheritStdio?: boolean
  shell?: boolean | string
}

export interface ProcessResult {
  exitCode: number | null
  stdout: string
  stderr: string
  pid: number
  timedOut: boolean
}

export class ProcessHelper {
  private runningProcesses = new Map<number, ChildProcess>()

  spawnProcess(command: string, args: string[] = [], options: ProcessOptions = {}): ChildProcess {
    const {
      cwd = process.cwd(),
      env = process.env,
      timeout,
      inheritStdio = false,
      shell = false,
    } = options

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env } as Record<string, string>,
      stdio: inheritStdio ? 'inherit' : 'pipe',
      shell,
      detached: true,
    })

    this.runningProcesses.set(child.pid!, child)

    if (timeout) {
      setTimeout(() => {
        if (!child.killed)
          this.killProcessTree(child.pid!)
      }, timeout)
    }

    child.on('exit', () => this.runningProcesses.delete(child.pid!))

    child.on('error', (error) => {
      this.runningProcesses.delete(child.pid!)
      throw new TestFrameworkError(`Process error: ${error.message}`, 'PROCESS_SPAWN_FAILED')
    })

    return child
  }

  async executeProcess(command: string, args: string[] = [], options: ProcessOptions = {}): Promise<ProcessResult> {
    return new Promise((resolve) => {
      const { timeout = 30000, captureOutput = true } = options
      const child = this.spawnProcess(command, args, { ...options, inheritStdio: false })

      let stdout = ''
      let stderr = ''
      let timedOut = false

      if (captureOutput) {
        child.stdout?.on('data', data => stdout += data.toString())
        child.stderr?.on('data', data => stderr += data.toString())
      }

      const timeoutId = timeout
        ? setTimeout(() => {
            timedOut = true
            this.killProcessTree(child.pid!)
          }, timeout)
        : null

      child.on('exit', (code) => {
        if (timeoutId)
          clearTimeout(timeoutId)
        resolve({ exitCode: code, stdout, stderr, pid: child.pid!, timedOut })
      })
    })
  }

  async killProcessTree(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (process.platform === 'win32') {
      try {
        await execAsync(`taskkill /PID ${pid} /T /F`)
      }
      catch {
        process.kill(pid, signal)
      }
    }
    else {
      try {
        process.kill(-pid, signal)
      }
      catch {
        process.kill(pid, signal)
      }
    }
    this.runningProcesses.delete(pid)
  }

  isProcessRunning(pid: number): boolean {
    return this.runningProcesses.has(pid)
  }

  getRunningProcesses(): number[] {
    return Array.from(this.runningProcesses.keys())
  }

  async killAll(): Promise<void> {
    await Promise.all(
      this.getRunningProcesses().map(pid => this.killProcessTree(pid).catch()),
    )
    this.runningProcesses.clear()
  }

  createServerConfig(
    type: 'frontend' | 'backend' | 'mcp',
    command: string,
    port: number,
    args: string[] = [],
  ): ServerConfig {
    return {
      type,
      port,
      command,
      args,
      state: 'stopped',
      healthEndpoint: type === 'backend' ? '/health' : undefined,
    }
  }
}

export const processHelper = new ProcessHelper()

export const spawnProcess = processHelper.spawnProcess.bind(processHelper)
export const executeProcess = processHelper.executeProcess.bind(processHelper)
export const killProcessTree = processHelper.killProcessTree.bind(processHelper)

/**
 * Find the project root by looking for package.json
 * Starts from current directory and traverses upward
 */
export function findProjectRoot(startPath: string = process.cwd()): string {
  let currentPath = startPath

  while (currentPath !== '/') {
    if (existsSync(join(currentPath, 'package.json'))) {
      return currentPath
    }
    currentPath = join(currentPath, '..')
  }

  throw new TestFrameworkError(
    'Could not find project root (package.json not found)',
    'PROJECT_ROOT_NOT_FOUND',
  )
}
