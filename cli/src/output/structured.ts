import type { Project } from '@mdt/shared/models/Project.js'
import type { Ticket } from '@mdt/shared/models/Ticket.js'
import type { AttrUpdateResult } from './formatter.js'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { statusDisplayLabel } from './colors.js'

export type OutputFormat = 'human' | 'json' | 'yaml'

export interface StructuredOutputOptions {
  json?: boolean
  yaml?: boolean
}

export interface StructuredEnvelope {
  schemaVersion: 1
  ok: boolean
  command: string
  data?: unknown
  meta?: Record<string, unknown>
  diagnostics: unknown[]
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export class CliCommandError extends Error {
  public readonly code: string
  public readonly details?: Record<string, unknown>

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'CliCommandError'
    this.code = code
    this.details = details
  }
}

export function getOutputFormat(options: StructuredOutputOptions = {}): OutputFormat {
  if (options.json)
    return 'json'
  if (options.yaml)
    return 'yaml'
  return 'human'
}

export function getRequestedOutputFormat(options: StructuredOutputOptions = {}): Exclude<OutputFormat, 'human'> | null {
  if (options.json)
    return 'json'
  if (options.yaml)
    return 'yaml'
  return null
}

export function assertSingleOutputFormat(options: StructuredOutputOptions = {}): void {
  if (options.json && options.yaml) {
    throw new CliCommandError(
      'OUTPUT_FORMAT_CONFLICT',
      '--json and --yaml are mutually exclusive',
    )
  }
}

export function formatStructuredSuccess(
  format: Exclude<OutputFormat, 'human'>,
  command: string,
  data: unknown,
  meta: Record<string, unknown> = {},
  diagnostics: unknown[] = [],
): string {
  return serialize(format, {
    schemaVersion: 1,
    ok: true,
    command,
    data,
    meta,
    diagnostics,
  })
}

export function formatStructuredError(
  format: Exclude<OutputFormat, 'human'>,
  command: string,
  error: unknown,
  diagnostics: unknown[] = [],
): string {
  return serialize(format, {
    schemaVersion: 1,
    ok: false,
    command,
    error: normalizeError(error),
    diagnostics,
  })
}

export function writeStructuredSuccess(
  format: Exclude<OutputFormat, 'human'>,
  command: string,
  data: unknown,
  meta: Record<string, unknown> = {},
  diagnostics: unknown[] = [],
): void {
  console.log(formatStructuredSuccess(format, command, data, meta, diagnostics))
}

export function writeStructuredError(
  format: Exclude<OutputFormat, 'human'>,
  command: string,
  error: unknown,
  diagnostics: unknown[] = [],
): void {
  console.error(formatStructuredError(format, command, error, diagnostics))
}

export function formatTicketForStructured(ticket: Ticket, projectPath?: string): Record<string, unknown> {
  return {
    key: ticket.code,
    title: ticket.title,
    status: enumValue(ticket.status, statusDisplayLabel(ticket.status)),
    type: enumValue(ticket.type),
    priority: enumValue(ticket.priority),
    phaseEpic: ticket.phaseEpic || null,
    assignee: ticket.assignee || null,
    dates: {
      created: toIso(ticket.dateCreated),
      modified: toIso(ticket.lastModified),
      implementation: toIso(ticket.implementationDate ?? null),
    },
    paths: pathObject(ticket.filePath, projectPath),
    relations: {
      relatedTickets: ticket.relatedTickets || [],
      dependsOn: ticket.dependsOn || [],
      blocks: ticket.blocks || [],
    },
    implementationNotes: ticket.implementationNotes || null,
    worktree: {
      inWorktree: ticket.inWorktree ?? false,
      path: ticket.worktreePath || null,
    },
    subdocuments: listStructuredSubdocuments(ticket, projectPath),
  }
}

export function formatProjectForStructured(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    code: project.project.code,
    name: project.project.name,
    description: project.project.description || null,
    active: project.project.active !== false,
    paths: {
      root: project.project.path,
      config: project.project.configFile || null,
    },
    ticketsPath: project.project.ticketsPath,
    metadata: {
      dateRegistered: project.metadata.dateRegistered,
      lastAccessed: project.metadata.lastAccessed,
      version: project.metadata.version,
      globalOnly: project.metadata.globalOnly ?? false,
    },
  }
}

export function formatAttrChangesForStructured(results: AttrUpdateResult[]): Record<string, unknown>[] {
  return results.map(result => ({
    field: result.field,
    op: result.op,
    oldValue: result.oldValue,
    newValue: result.newValue,
    changed: result.oldValue !== result.newValue,
  }))
}

export function pathObject(filePath: string, projectPath?: string): Record<string, string> {
  const absolute = toAbsolutePath(filePath, projectPath)
  return {
    relative: toRelativePath(absolute, projectPath),
    absolute,
  }
}

function serialize(format: Exclude<OutputFormat, 'human'>, envelope: StructuredEnvelope): string {
  if (format === 'json')
    return JSON.stringify(envelope, null, 2)
  return toYaml(envelope)
}

function normalizeError(error: unknown): StructuredEnvelope['error'] {
  if (error instanceof CliCommandError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    }
  }

  if (error instanceof Error) {
    const withCode = error as Error & { code?: string; details?: Record<string, unknown> }
    return {
      code: withCode.code || 'CLI_ERROR',
      message: error.message,
      ...(withCode.details ? { details: withCode.details } : {}),
    }
  }

  return {
    code: 'CLI_ERROR',
    message: String(error),
  }
}

function enumValue(value: string, label = value): Record<string, string> {
  return { value, label }
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function toAbsolutePath(filePath: string, projectPath?: string): string {
  if (path.isAbsolute(filePath))
    return filePath
  return path.resolve(projectPath || process.cwd(), filePath)
}

function toRelativePath(filePath: string, projectPath?: string): string {
  if (!projectPath)
    return filePath
  const relative = path.relative(projectPath, filePath)
  return relative || '.'
}

function listStructuredSubdocuments(ticket: Ticket, projectPath?: string): Record<string, unknown>[] {
  const crDir = path.resolve(path.dirname(ticket.filePath), ticket.code)

  try {
    if (!statSync(crDir).isDirectory())
      return []
  }
  catch {
    return []
  }

  let entries: string[]
  try {
    entries = readdirSync(crDir)
  }
  catch {
    return []
  }

  return entries
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => {
      const absolutePath = path.join(crDir, entry)
      const kind = isDirectory(absolutePath) ? 'directory' : 'file'
      return {
        name: entry,
        kind,
        path: pathObject(absolutePath, projectPath),
      }
    })
}

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory()
  }
  catch {
    return false
  }
}

function toYaml(value: unknown, indent = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0)
      return '[]'

    return value.map((item) => {
      if (isScalar(item))
        return `${spaces(indent)}- ${formatScalar(item)}`

      const rendered = toYaml(item, indent + 2)
      return `${spaces(indent)}-\n${rendered}`
    }).join('\n')
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0)
      return '{}'

    return entries.map(([key, entryValue]) => {
      if (isScalar(entryValue))
        return `${spaces(indent)}${key}: ${formatScalar(entryValue)}`

      const rendered = toYaml(entryValue, indent + 2)
      if (rendered === '[]' || rendered === '{}')
        return `${spaces(indent)}${key}: ${rendered}`
      return `${spaces(indent)}${key}:\n${rendered}`
    }).join('\n')
  }

  return `${spaces(indent)}${formatScalar(value)}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScalar(value: unknown): boolean {
  return value === null || typeof value !== 'object'
}

function formatScalar(value: unknown): string {
  if (value === null)
    return 'null'
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return JSON.stringify(String(value))
}

function spaces(count: number): string {
  return ' '.repeat(count)
}
