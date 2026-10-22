import { z } from 'zod'
import { DocumentPathsPatchSchema } from '../config-management/patch-schemas'
import {
  CreateProjectInputSchema,
  DocumentConfigSchema,
  LocalProjectConfigProjectSchema,
  LocalProjectConfigSchema,
  ProjectConfigSchema,
  ProjectDetailsSchema,
  ProjectDocumentSettingsSchema,
  ProjectSharingMode,
  ProjectSharingModes,
  ProjectSharingModeSchema,
  ProjectSharingSettingsSchema,
  TicketsPathSchema,
  UpdateProjectInputSchema,
} from './schema'

// MCP references deliberately allow numeric-leading codes (unlike persisted IDs)
// and preserve spelling until the existing project validator normalizes it.
export { ProjectReferenceInputSchema } from './reference-input'

// The registration manager generates code and supplies defaults. Do not reuse
// the complete entity/create form contract here or normalize before the manager.
export const RegisterProjectInputSchema = z.object({
  name: z.string(),
  path: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  ticketsPath: z.string().optional(),
  globalOnly: z.boolean().optional(),
  createProjectPath: z.boolean().optional(),
  documentPaths: z.array(z.string()).optional(),
  maxDepth: z.number().optional(),
})

// Empty and ignored-only updates remain no-ops; validators own text policy.
export const ProjectUpdateEnvelopeSchema = RegisterProjectInputSchema.pick({
  name: true,
  description: true,
  repository: true,
}).partial().extend({ active: z.boolean().optional() })

export const UpdateProjectSharingInputSchema = z.object({
  mode: ProjectSharingModeSchema,
  rotateShareId: z.boolean().optional(),
  shareId: z.never().optional(),
})

export const ConfigureDocumentsInputSchema = z.object({
  projectId: z.string().min(1),
  documentPaths: DocumentPathsPatchSchema,
})

export type RegisterProjectInput = z.output<typeof RegisterProjectInputSchema>

export {
  CreateProjectInputSchema,
  DocumentConfigSchema,
  LocalProjectConfigProjectSchema,
  LocalProjectConfigSchema,
  ProjectConfigSchema,
  ProjectDetailsSchema,
  ProjectDocumentSettingsSchema,
  ProjectSharingMode,
  ProjectSharingModes,
  ProjectSharingModeSchema,
  ProjectSharingSettingsSchema,
  TicketsPathSchema,
  UpdateProjectInputSchema,
}

export type {
  CreateProjectInput,
  DocumentConfig,
  LocalProjectConfig,
  LocalProjectConfigProject,
  ProjectConfig,
  ProjectConfigProject,
  ProjectDetails,
  ProjectDocumentSettings,
  ProjectEditFormData,
  ProjectSharingModeValue,
  ProjectSharingSettings,
  TicketsPath,
  UpdateProjectInput,
} from './schema'
