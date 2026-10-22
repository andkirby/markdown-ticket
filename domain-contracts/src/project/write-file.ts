import { z } from 'zod'

// Write reloads are shape checks, not entity validation or migration. Preserve
// spelling, legacy counters, missing optional fields and extensions at every
// level; never introduce defaults into unrelated persisted settings.
const DocumentWriteFileSchema = z.looseObject({
  paths: z.array(z.string()).optional(),
  excludeFolders: z.array(z.string()).optional(),
  maxDepth: z.number().optional(),
  preview: z.looseObject({
    allowedExternalDomains: z.array(z.string()).optional(),
    allowUnsafeEval: z.boolean().optional(),
  }).optional(),
})

const ProjectWriteFieldsSchema = z.looseObject({
  name: z.string().optional(),
  code: z.string().optional(),
  id: z.string().optional(),
  path: z.string().optional(),
  ticketsPath: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  active: z.boolean().optional(),
  startNumber: z.union([z.number(), z.string()]).optional(),
  counterFile: z.string().optional(),
  document: DocumentWriteFileSchema.optional(),
})

export const ProjectConfigWriteFileSchema = z.looseObject({
  project: ProjectWriteFieldsSchema,
  document: DocumentWriteFileSchema.optional(),
  document_paths: z.array(z.string()).optional(),
  exclude_folders: z.array(z.string()).optional(),
})

// The document command historically also supports an absent [project] table.
export const ProjectDocumentWriteFileSchema = ProjectConfigWriteFileSchema.partial({ project: true })

export const ProjectRegistryWriteFileSchema = z.looseObject({
  project: ProjectWriteFieldsSchema.extend({ path: z.string().min(1) }),
  metadata: z.looseObject({
    dateRegistered: z.string().optional(),
    lastAccessed: z.string().optional(),
    version: z.string().optional(),
    globalOnly: z.boolean().optional(),
    sharing: z.looseObject({
      mode: z.string().optional(),
      shareId: z.string().optional(),
      updatedAt: z.string().optional(),
    }).optional(),
  }).optional(),
})

export type ProjectConfigWriteFile = z.output<typeof ProjectConfigWriteFileSchema>
export type ProjectRegistryWriteFile = z.output<typeof ProjectRegistryWriteFileSchema>
