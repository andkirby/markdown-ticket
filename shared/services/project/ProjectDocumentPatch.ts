/**
 * Typed project-document patch command (MDT-168).
 *
 * Replaces the positional `configureDocuments(projectId, documentPaths)` seam
 * with a typed patch that validates the COMPLETE candidate configuration before
 * one atomic write, merges only the provided fields (preserving siblings), and
 * returns the effective saved values for refresh.
 *
 * Strictness (assess.md mismatch 1, constraint C-2/C-3, Edge-1): mutation input
 * is validated with the strict patch schemas from domain-contracts. An invalid
 * field rejects the whole patch before any write (no partial application).
 */
import type { ProjectDocumentSettings } from '@mdt/domain-contracts'
import {
  DocumentExcludeFoldersPatchSchema,
  DocumentMaxDepthPatchSchema,
  DocumentPathsPatchSchema,
  PROJECT_DOCUMENT_CONFIG_DEFAULTS,
} from '@mdt/domain-contracts'

/** A partial project-document patch: only provided fields are applied. */
export interface ProjectDocumentPatchInput {
  paths?: string[]
  excludeFolders?: string[]
  maxDepth?: number
}

/** Effective document configuration after a patch is applied. */
export interface ProjectDocumentEffectiveConfig {
  paths: string[]
  excludeFolders: string[]
  maxDepth: number
}

/** Result of validating a patch candidate. */
export type ProjectDocumentPatchValidation
  = | { ok: true, validated: ProjectDocumentPatchInput }
    | { ok: false, field: string, message: string }

/**
 * Validate a patch input strictly. Returns the first field-level failure or the
 * validated patch. Never converts an invalid value to a default.
 */
export function validateProjectDocumentPatch(
  input: unknown,
): ProjectDocumentPatchValidation {
  if (input === null || typeof input !== 'object') {
    return {
      ok: false,
      field: 'project.document',
      message: 'Document patch must be an object.',
    }
  }
  const patch = input as Record<string, unknown>

  if ('paths' in patch) {
    const result = DocumentPathsPatchSchema.safeParse(patch.paths)
    if (!result.success) {
      return {
        ok: false,
        field: 'project.document.paths',
        message: result.error.issues[0]?.message ?? 'Invalid paths.',
      }
    }
  }
  if ('excludeFolders' in patch) {
    const result = DocumentExcludeFoldersPatchSchema.safeParse(
      patch.excludeFolders,
    )
    if (!result.success) {
      return {
        ok: false,
        field: 'project.document.excludeFolders',
        message: result.error.issues[0]?.message ?? 'Invalid excludeFolders.',
      }
    }
  }
  if ('maxDepth' in patch) {
    const result = DocumentMaxDepthPatchSchema.safeParse(patch.maxDepth)
    if (!result.success) {
      return {
        ok: false,
        field: 'project.document.maxDepth',
        message: result.error.issues[0]?.message ?? 'Invalid maxDepth.',
      }
    }
  }

  const validated: ProjectDocumentPatchInput = {}
  if ('paths' in patch)
    validated.paths = patch.paths as string[]
  if ('excludeFolders' in patch)
    validated.excludeFolders = patch.excludeFolders as string[]
  if ('maxDepth' in patch)
    validated.maxDepth = patch.maxDepth as number
  return { ok: true, validated }
}

/**
 * Compute the effective document config by merging a validated patch onto
 * existing settings, applying canonical defaults for any absent required field.
 *
 * This does NOT write; it computes the candidate that will be validated and
 * written by the caller. Used to return effective values for refresh.
 */
export function computeEffectiveDocumentConfig(
  existing: ProjectDocumentSettings | undefined,
  patch: ProjectDocumentPatchInput,
): ProjectDocumentEffectiveConfig {
  const merged: ProjectDocumentEffectiveConfig = {
    paths: patch.paths
      ?? existing?.paths ?? [...PROJECT_DOCUMENT_CONFIG_DEFAULTS.paths],
    excludeFolders: patch.excludeFolders
      ?? existing?.excludeFolders ?? [
      ...PROJECT_DOCUMENT_CONFIG_DEFAULTS.excludeFolders,
    ],
    maxDepth:
      patch.maxDepth
      ?? existing?.maxDepth
      ?? PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth,
  }
  return merged
}

/**
 * Apply a validated patch to a mutable document-settings object in place,
 * preserving sibling fields not present in the patch.
 *
 * The caller must have already validated the patch via
 * `validateProjectDocumentPatch`. This function performs the merge only.
 */
export function applyProjectDocumentPatch(
  target: ProjectDocumentSettings,
  patch: ProjectDocumentPatchInput,
): ProjectDocumentEffectiveConfig {
  if (patch.paths !== undefined)
    target.paths = patch.paths
  if (patch.excludeFolders !== undefined)
    target.excludeFolders = patch.excludeFolders
  if (patch.maxDepth !== undefined)
    target.maxDepth = patch.maxDepth
  return computeEffectiveDocumentConfig(target, {})
}
