import { z } from 'zod'
import { ProjectConfigSchema, ProjectSharingModeSchema } from './schema'
import { ProjectRegistryWriteFileSchema } from './write-file'

// The historical predicate checked the entity but returned the untransformed
// input. Preserve spelling, absent defaults, extensions and migration triggers.
// z.input is deliberate: using z.output here would promise preview defaults
// that the persisted file does not contain.
export const ProjectConfigReadFileSchema = z.custom<z.input<typeof ProjectConfigSchema>>(
  value => ProjectConfigSchema.safeParse(value).success,
)
export type ProjectConfigReadFile = z.output<typeof ProjectConfigReadFileSchema>

// Minimal registry references need only a string path; metadata is optional.
// Derive the fields from the compatible reload shape, without entity transforms.
export const ProjectRegistryReadFileSchema = ProjectRegistryWriteFileSchema.extend({
  project: ProjectRegistryWriteFileSchema.shape.project.extend({
    path: z.string(),
    dateRegistered: z.string().optional(),
  }),
  metadata: ProjectRegistryWriteFileSchema.shape.metadata.unwrap().extend({
    sharing: z.looseObject({
      mode: ProjectSharingModeSchema,
      shareId: z.string().optional(),
      updatedAt: z.string().optional(),
    }).optional().catch(undefined),
  }).optional(),
})
export type ProjectRegistryReadFile = z.output<typeof ProjectRegistryReadFileSchema>

// Display/extraction readers tolerate malformed individual settings. This is
// intentionally not a mutation contract: one bad field cannot erase siblings.
const strings = z.array(z.unknown()).optional().catch(undefined)
export const ProjectDocumentReadFileSchema = z.looseObject({
  project: z.looseObject({
    name: z.string().optional().catch(undefined),
    code: z.string().optional().catch(undefined),
    ticketsPath: z.string().optional().catch(undefined),
    path: z.string().optional().catch(undefined),
    document: z.looseObject({
      paths: strings,
      excludeFolders: strings,
      maxDepth: z.number().optional().catch(undefined),
      preview: z.looseObject({
        allowedExternalDomains: strings,
        allowUnsafeEval: z.boolean().optional().catch(undefined),
      }).optional().catch(undefined),
    }).optional().catch(undefined),
  }).optional().catch(undefined),
})

export type ProjectDocumentReadFile = z.output<typeof ProjectDocumentReadFileSchema>

// Collision scans consume only sharing identity. Unrelated registry fields must
// not hide an existing share ID from the collision check.
export const ProjectRegistrySharingFileSchema = z.looseObject({
  metadata: z.looseObject({
    sharing: z.looseObject({ shareId: z.string().optional().catch(undefined) }).optional().catch(undefined),
  }).optional().catch(undefined),
})

// The settings display reader exposes raw selector values, including malformed
// individual fields. Do not apply the document repository extraction defaults
// here; the selector consumer owns interpretation of these unknown values.
export const ProjectConfigDisplayFileSchema = z.looseObject({
  project: z.record(z.string(), z.unknown()).optional().catch(undefined),
})
export type ProjectConfigDisplayFile = z.output<typeof ProjectConfigDisplayFileSchema>
