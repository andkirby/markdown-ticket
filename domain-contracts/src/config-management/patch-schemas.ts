/**
 * Strict configuration mutation patch schemas (MDT-168).
 *
 * These schemas validate mutation *input*. They are STRICT and fail-closed:
 * they never recover invalid input to a default (no `.catch()`). This is the
 * opposite of the tolerant persisted-file read schemas in `app-config/schema.ts`,
 * which normalize stored values for display.
 *
 * Separation rule (assess.md mismatch 1, constraint C-2): tolerant read schemas
 * and strict mutation schemas must stay separate. Invalid mutation input must be
 * rejected, never converted to a default.
 */
import { z } from 'zod'
import {
  SafeConfigPathStringSchema,
  SafeConfigStringOptionalSchema,
  SafeConfigStringSchema,
} from '../app-config/schema'
import { PROJECT_CODE_PATTERN } from '../project/schema'
import { PROJECT_DOCUMENT_CONFIG_DEFAULTS } from './defaults'

/** Rejects "..", absolute paths, and path separators in folder entries. */
const RelativeFolderEntrySchema = z
  .string()
  .min(1)
  .max(1024)
  .refine(p => !p.includes('\0'), 'Folder must not contain null bytes')
  .refine(p => !p.includes('\n'), 'Folder must not contain newlines')
  .refine(p => !p.includes('\r'), 'Folder must not contain carriage returns')
  .refine(p => !p.startsWith('/'), 'Folder must not be absolute')
  .refine(
    p => !p.includes('..'),
    'Folder must not contain parent traversal (..)',
  )

/** Document path entry: relative, no traversal, no absolute. */
const DocumentPathEntrySchema = RelativeFolderEntrySchema

// --- project scalar patches ---
export const ProjectNamePatchSchema = SafeConfigStringSchema

export const ProjectDescriptionPatchSchema = SafeConfigStringOptionalSchema

export const ProjectRepositoryPatchSchema = z
  .string()
  .max(512)
  .or(z.literal(''))

export const ProjectActivePatchSchema = z.boolean()

export const ProjectCodePatchSchema = z
  .string()
  .min(2, 'Project code must be 2-5 chars')
  .max(5, 'Project code must be 2-5 chars')
  .regex(
    PROJECT_CODE_PATTERN,
    'Project code must be 2-5 chars, start with uppercase letter, and contain only alphanumeric characters',
  )

export const ProjectTicketsPathPatchSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(p => !p.includes('\0'), 'Tickets path must not contain null bytes')
  .refine(p => !p.startsWith('/'), 'Tickets path must be relative')
  .refine(
    p => !p.includes('..'),
    'Tickets path must not contain parent traversal (..)',
  )

// --- project.document patches ---
export const DocumentPathsPatchSchema = z.array(DocumentPathEntrySchema)

export const DocumentExcludeFoldersPatchSchema = z.array(
  RelativeFolderEntrySchema,
)

export const DocumentMaxDepthPatchSchema = z
  .number()
  .int('maxDepth must be an integer')
  .min(
    PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth === 5 ? 1 : 1,
    'maxDepth must be at least 1',
  )
  .max(10, 'maxDepth must be at most 10')

// --- global discovery/system patches ---
export const DiscoveryAutoDiscoverPatchSchema = z.boolean()

export const DiscoverySearchPathsPatchSchema = z.array(
  SafeConfigPathStringSchema,
)

export const DiscoveryMaxDepthPatchSchema = z
  .number()
  .int('discovery.maxDepth must be an integer')
  .min(1, 'discovery.maxDepth must be at least 1')
  .max(50, 'discovery.maxDepth must be at most 50')

export const SystemCacheTimeoutPatchSchema = z
  .number()
  .int()
  .min(0, 'cacheTimeout must be non-negative')

export const SystemLogLevelPatchSchema = z.enum([
  'debug',
  'info',
  'warn',
  'error',
])

// --- global link patches ---
export const LinkBooleanPatchSchema = z.boolean()

// --- stable user preference patches ---
export const ProjectSelectorVisibleCountPatchSchema = z
  .number()
  .int()
  .min(1, 'visibleCount must be a positive integer')

export const ProjectSelectorCompactInactivePatchSchema = z.boolean()

/**
 * Strict patch validator for a single selector. Returns the parsed value or a
 * ZodError; never converts invalid input to a default. Throws if the selector
 * is unknown (callers must check the allowlist first).
 */
export function strictPatchValidator(selector: string): z.ZodTypeAny {
  const map: Record<string, z.ZodTypeAny> = {
    'project.name': ProjectNamePatchSchema,
    'project.description': ProjectDescriptionPatchSchema,
    'project.repository': ProjectRepositoryPatchSchema,
    'project.active': ProjectActivePatchSchema,
    'project.code': ProjectCodePatchSchema,
    'project.ticketsPath': ProjectTicketsPathPatchSchema,
    'project.document.paths': DocumentPathsPatchSchema,
    'project.document.excludeFolders': DocumentExcludeFoldersPatchSchema,
    'project.document.maxDepth': DocumentMaxDepthPatchSchema,
    'discovery.autoDiscover': DiscoveryAutoDiscoverPatchSchema,
    'discovery.searchPaths': DiscoverySearchPathsPatchSchema,
    'discovery.maxDepth': DiscoveryMaxDepthPatchSchema,
    'system.cacheTimeout': SystemCacheTimeoutPatchSchema,
    'system.logLevel': SystemLogLevelPatchSchema,
    'links.enableAutoLinking': LinkBooleanPatchSchema,
    'links.enableTicketLinks': LinkBooleanPatchSchema,
    'links.enableDocumentLinks': LinkBooleanPatchSchema,
    'links.enableHoverPreviews': LinkBooleanPatchSchema,
    'links.linkValidation': LinkBooleanPatchSchema,
    'ui.projectSelector.visibleCount': ProjectSelectorVisibleCountPatchSchema,
    'ui.projectSelector.compactInactive':
      ProjectSelectorCompactInactivePatchSchema,
  }
  const schema = map[selector]
  if (!schema) {
    throw new Error(
      `No strict patch schema registered for selector: ${selector}`,
    )
  }
  return schema
}
