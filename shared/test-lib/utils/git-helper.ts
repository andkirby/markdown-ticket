import { execFile } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { TestFrameworkError } from '../types.js'

const execFileAsync = promisify(execFile)
const DEFAULT_TIMEOUT_MS = 10000
const TEST_GIT_IDENTITY = {
  GIT_AUTHOR_NAME: 'MDT Test',
  GIT_AUTHOR_EMAIL: 'mdt-test@example.com',
  GIT_COMMITTER_NAME: 'MDT Test',
  GIT_COMMITTER_EMAIL: 'mdt-test@example.com',
} as const

export interface GitCommandResult {
  stdout: string
  stderr: string
}

export interface CreateGitWorktreeInput {
  branchName: string
  worktreePath: string
  startPoint?: string
}

function formatGitError(args: string[], error: unknown): string {
  if (!(error instanceof Error)) {
    return `git ${args.join(' ')} failed: ${String(error)}`
  }

  const stdout = 'stdout' in error && typeof error.stdout === 'string'
    ? error.stdout.trim()
    : ''
  const stderr = 'stderr' in error && typeof error.stderr === 'string'
    ? error.stderr.trim()
    : ''

  return [
    `git ${args.join(' ')} failed`,
    error.message,
    stdout ? `stdout: ${stdout}` : '',
    stderr ? `stderr: ${stderr}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function runGitCommand(
  repoPath: string,
  args: string[],
  timeout = DEFAULT_TIMEOUT_MS,
): Promise<GitCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.env.GIT_EXECUTABLE || 'git',
      args,
      {
        cwd: repoPath,
        timeout,
        env: {
          ...process.env,
          ...TEST_GIT_IDENTITY,
        },
      },
    )

    return { stdout, stderr }
  }
  catch (error) {
    throw new TestFrameworkError(
      formatGitError(args, error),
      'GIT_COMMAND_FAILED',
    )
  }
}

export async function initGitRepository(
  repoPath: string,
  initialBranch = 'main',
): Promise<void> {
  await runGitCommand(repoPath, ['init', '--initial-branch', initialBranch])
  await runGitCommand(repoPath, ['config', 'user.name', TEST_GIT_IDENTITY.GIT_AUTHOR_NAME])
  await runGitCommand(repoPath, ['config', 'user.email', TEST_GIT_IDENTITY.GIT_AUTHOR_EMAIL])
  await runGitCommand(repoPath, ['config', 'commit.gpgsign', 'false'])
}

export async function commitAllChanges(
  repoPath: string,
  message: string,
): Promise<void> {
  await runGitCommand(repoPath, ['add', '.'])
  await runGitCommand(repoPath, ['commit', '--allow-empty', '-m', message])
}

export async function createGitWorktree(
  repoPath: string,
  input: CreateGitWorktreeInput,
): Promise<void> {
  mkdirSync(dirname(input.worktreePath), { recursive: true })

  await runGitCommand(
    repoPath,
    [
      'worktree',
      'add',
      '-b',
      input.branchName,
      input.worktreePath,
      input.startPoint || 'HEAD',
    ],
  )
}

export async function getCurrentGitBranch(repoPath: string): Promise<string> {
  const { stdout } = await runGitCommand(repoPath, ['branch', '--show-current'])
  return stdout.trim()
}
