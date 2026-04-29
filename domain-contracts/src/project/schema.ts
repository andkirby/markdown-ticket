import type { WorktreeConfig } from './worktree'
import { z } from 'zod'
import { WorktreeConfigSchema } from './worktree'

export const PROJECT_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}$/
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u
const TICKETS_PATH_INVALID_CHARS_PATTERN = /[<>"|?*]/u

function normalizeTicketsPath(path: string): string {
  return path
    .replace(/\\/gu, '/')
    .replace(/^\.\/+/u, '')
    .replace(/\/+$/u, '')
}

export interface DocumentConfig {
  paths: string[]
  excludeFolders: string[]
  maxDepth: number
}

export interface ProjectDocumentSettings {
  paths?: string[]
  excludeFolders?: string[]
  maxDepth?: number
}

export interface ProjectDetails {
  code: string
  name: string
  id: string
  ticketsPath: string
  description?: string
  repository?: string
  active: boolean
}

export interface LocalProjectConfigProject {
  code: string
  name: string
  id?: string
  ticketsPath?: string
  description?: string
  repository?: string
  active?: boolean
  path?: string
  startNumber?: number
  counterFile?: string
  document?: ProjectDocumentSettings
  /** Allow symlink following in subdocument reads (default: false). MDT-151 */
  allowSymlinks?: boolean
}

export interface LocalProjectConfig {
  project: LocalProjectConfigProject
  worktree?: WorktreeConfig
}

export interface ProjectConfig {
  project: LocalProjectConfigProject & {
    [key: string]: unknown
  }
  document?: ProjectDocumentSettings
  document_paths?: string[]
  exclude_folders?: string[]
  worktree?: WorktreeConfig
  [key: string]: unknown
}

export interface ProjectRuntimeFields {
  id: string
  name: string
  code: string
  path: string
  configFile: string
  counterFile?: string
  startNumber?: number
  active: boolean
  description: string
  repository: string
  ticketsPath: string
}

export interface ProjectMetadata {
  dateRegistered: string
  lastAccessed: string
  version: string
  globalOnly?: boolean
}

export interface Project {
  id: string
  project: ProjectRuntimeFields
  metadata: ProjectMetadata
  tickets?: {
    codePattern?: string
  }
  document?: ProjectDocumentSettings
  autoDiscovered?: boolean
  configPath?: string
  registryFile?: string
}

export interface ProjectRegistryProject {
  path: string
  active?: boolean
  name?: string
  code?: string
  id?: string
  ticketsPath?: string
  description?: string
  repository?: string
  startNumber?: number
  counterFile?: string
  dateRegistered?: string
  document?: ProjectDocumentSettings
}

export interface ProjectRegistryEntry {
  project: ProjectRegistryProject
  metadata: ProjectMetadata
}

const DocumentConfigObjectSchema = z.object({
  paths: z.array(z.string()).default([]),
  excludeFolders: z.array(z.string()).default([]),
  maxDepth: z.number().int().min(1).max(10).default(3),
}).strict()

export const ProjectCodeSchema = z.string()
  .min(2, 'Project code must be 2-5 chars')
  .max(5, 'Project code must be 2-5 chars')
  .regex(PROJECT_CODE_PATTERN, 'Project code must be 2-5 chars, start with uppercase letter, and contain only alphanumeric characters')

export const ProjectNameSchema = z.string()
  .min(1, 'Project name cannot be empty or whitespace-only')
  .refine(
    name => name.trim().length >= 3,
    'Project name must have at least 3 characters',
  )

export const ProjectIdSchema = z.string()
  .trim()
  .min(1, 'Required')

export const ProjectPathSchema = z.string()
  .trim()
  .min(1, 'Project path is required')

export const CounterFileSchema = z.string()
  .trim()
  .min(1, 'Counter file is required')

export const StartNumberSchema = z.number()
  .int('Start number must be an integer')
  .min(1, 'Start number must be at least 1')

const StartNumberInputSchema = z.union([
  StartNumberSchema,
  z.string()
    .trim()
    .regex(/^\d+$/u, 'Start number must be numeric'),
])

export const DateOnlySchema = z.string()
  .regex(DATE_ONLY_PATTERN, 'Date must be in YYYY-MM-DD format')

export const TicketsPathSchema = z.string()
  .trim()
  .min(1, 'Tickets path is required')
export const DocumentConfigSchema = DocumentConfigObjectSchema.refine(
  (data) => {
    const hasParentRef = data.paths.some(path => path.includes('..'))
    return !hasParentRef
  },
  {
    message: 'Parent directory references (..) are not allowed in paths',
    path: ['paths'],
  },
).refine(
  (data) => {
    const hasAbsolutePath = data.paths.some(path => path.startsWith('/'))
    return !hasAbsolutePath
  },
  {
    message: 'Absolute paths are not allowed, use relative paths only',
    path: ['paths'],
  },
).refine(
  (data) => {
    const hasPathSeparator = data.excludeFolders.some(folder =>
      folder.includes('/') || folder.includes('\\'),
    )
    return !hasPathSeparator
  },
  {
    message: 'excludeFolders should contain folder names, not paths',
    path: ['excludeFolders'],
  },
)

export const ProjectDocumentSettingsSchema = DocumentConfigObjectSchema.partial().strict()

export const ProjectDetailsSchema = z.object({
  code: ProjectCodeSchema,
  name: ProjectNameSchema,
  id: ProjectIdSchema,
  ticketsPath: TicketsPathSchema,
  description: z.string().optional(),
  repository: z.string().optional(),
  active: z.boolean().default(true),
}).strict()

export const LocalProjectConfigProjectSchema = z.object({
  code: ProjectCodeSchema,
  name: ProjectNameSchema,
  id: ProjectIdSchema.optional(),
  ticketsPath: TicketsPathSchema.optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  active: z.boolean().optional(),
  path: ProjectPathSchema.optional(),
  startNumber: StartNumberSchema.optional(),
  counterFile: CounterFileSchema.optional(),
  document: ProjectDocumentSettingsSchema.optional(),
}).strict()

export const LocalProjectConfigSchema = z.object({
  project: LocalProjectConfigProjectSchema,
  worktree: WorktreeConfigSchema.optional(),
}).strict()

export const ProjectConfigSchema = z.object({
  project: z.object({
    code: z.string().trim().min(1, 'Project code is required'),
    name: z.string().trim().min(1, 'Project name is required'),
    id: ProjectIdSchema.optional(),
    ticketsPath: TicketsPathSchema.optional(),
    active: z.boolean().optional(),
    description: z.string().optional(),
    repository: z.string().optional(),
    path: ProjectPathSchema.optional(),
    startNumber: StartNumberInputSchema.optional(),
    counterFile: CounterFileSchema.optional(),
    document: ProjectDocumentSettingsSchema.optional(),
  }).passthrough(),
  document: ProjectDocumentSettingsSchema.optional(),
  document_paths: z.array(z.string()).optional(),
  exclude_folders: z.array(z.string()).optional(),
  worktree: WorktreeConfigSchema.optional(),
}).passthrough()

export const ProjectRuntimeFieldsSchema = z.object({
  id: ProjectIdSchema,
  name: ProjectNameSchema,
  code: ProjectCodeSchema,
  path: ProjectPathSchema,
  configFile: z.string(),
  counterFile: CounterFileSchema.optional(),
  startNumber: StartNumberSchema.optional(),
  active: z.boolean(),
  description: z.string(),
  repository: z.string(),
  ticketsPath: TicketsPathSchema,
}).strict()

export const ProjectMetadataSchema = z.object({
  dateRegistered: DateOnlySchema,
  lastAccessed: DateOnlySchema,
  version: z.string().trim().min(1, 'Version is required'),
  globalOnly: z.boolean().optional(),
}).strict()

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  project: ProjectRuntimeFieldsSchema,
  metadata: ProjectMetadataSchema,
  tickets: z.object({
    codePattern: z.string().optional(),
  }).strict().optional(),
  document: ProjectDocumentSettingsSchema.optional(),
  autoDiscovered: z.boolean().optional(),
  configPath: z.string().optional(),
  registryFile: z.string().optional(),
}).strict()

export const ProjectRegistryProjectSchema = z.object({
  path: ProjectPathSchema,
  active: z.boolean().optional(),
  name: ProjectNameSchema.optional(),
  code: ProjectCodeSchema.optional(),
  id: ProjectIdSchema.optional(),
  ticketsPath: TicketsPathSchema.optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  startNumber: StartNumberSchema.optional(),
  counterFile: CounterFileSchema.optional(),
  dateRegistered: DateOnlySchema.optional(),
  document: ProjectDocumentSettingsSchema.optional(),
}).strict()

export const ProjectRegistryEntrySchema = z.object({
  project: ProjectRegistryProjectSchema,
  metadata: ProjectMetadataSchema,
}).strict()

export const CreateProjectInputSchema = z.object({
  code: ProjectCodeSchema,
  name: ProjectNameSchema,
  id: ProjectIdSchema,
  ticketsPath: TicketsPathSchema,
  description: z.string().optional(),
  repository: z.string().optional(),
}).strict()

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export const UpdateProjectInputSchema = z.object({
  name: ProjectNameSchema.optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  active: z.boolean().optional(),
}).strict().refine(
  data => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  },
)

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>

export type ProjectConfigProject = LocalProjectConfigProject
export type RegistryData = ProjectRegistryEntry
export type TicketsPath = string

export const ProjectSchemas = {
  project: ProjectSchema,
  projectDetails: ProjectDetailsSchema,
  localProjectConfig: LocalProjectConfigSchema,
  projectConfig: ProjectConfigSchema,
  projectRuntimeFields: ProjectRuntimeFieldsSchema,
  projectMetadata: ProjectMetadataSchema,
  projectRegistryEntry: ProjectRegistryEntrySchema,
  projectRegistryProject: ProjectRegistryProjectSchema,
  documentConfig: DocumentConfigSchema,
  createProjectInput: CreateProjectInputSchema,
  updateProjectInput: UpdateProjectInputSchema,
  ticketsPath: TicketsPathSchema,
} as const
