import { describe, expect, it } from '@jest/globals'
import {
  DiscoveryMaxDepthPatchSchema,
  DocumentExcludeFoldersPatchSchema,
  DocumentMaxDepthPatchSchema,
  DocumentPathsPatchSchema,
  LinkBooleanPatchSchema,
  ProjectCodePatchSchema,
  ProjectSelectorVisibleCountPatchSchema,
  strictPatchValidator,
} from '../patch-schemas'

describe('config-management strict patch schemas', () => {
  it('document maxDepth accepts 1..10 and rejects outside range', () => {
    expect(DocumentMaxDepthPatchSchema.safeParse(1).success).toBe(true)
    expect(DocumentMaxDepthPatchSchema.safeParse(5).success).toBe(true)
    expect(DocumentMaxDepthPatchSchema.safeParse(10).success).toBe(true)
    expect(DocumentMaxDepthPatchSchema.safeParse(0).success).toBe(false)
    expect(DocumentMaxDepthPatchSchema.safeParse(11).success).toBe(false)
    expect(DocumentMaxDepthPatchSchema.safeParse(3.5).success).toBe(false)
    expect(DocumentMaxDepthPatchSchema.safeParse('5').success).toBe(false)
  })

  it('discovery maxDepth accepts 1..50 and rejects outside range', () => {
    expect(DiscoveryMaxDepthPatchSchema.safeParse(1).success).toBe(true)
    expect(DiscoveryMaxDepthPatchSchema.safeParse(50).success).toBe(true)
    expect(DiscoveryMaxDepthPatchSchema.safeParse(0).success).toBe(false)
    expect(DiscoveryMaxDepthPatchSchema.safeParse(51).success).toBe(false)
  })

  it('document paths reject absolute and traversal entries', () => {
    expect(DocumentPathsPatchSchema.safeParse(['docs', 'docs/notes']).success).toBe(true)
    expect(DocumentPathsPatchSchema.safeParse(['/etc']).success).toBe(false)
    expect(DocumentPathsPatchSchema.safeParse(['../secret']).success).toBe(false)
  })

  it('exclude folders reject absolute and traversal entries', () => {
    expect(DocumentExcludeFoldersPatchSchema.safeParse(['node_modules', 'dist']).success).toBe(true)
    expect(DocumentExcludeFoldersPatchSchema.safeParse(['..']).success).toBe(false)
    expect(DocumentExcludeFoldersPatchSchema.safeParse(['/root']).success).toBe(false)
  })

  it('never converts invalid input to a default (no catch-to-default)', () => {
    // Strict schemas must REJECT, not recover. A successful parse of an invalid
    // value to a default would be a contract violation (C-2, BR-2.3).
    const bad = DocumentMaxDepthPatchSchema.safeParse(999)
    expect(bad.success).toBe(false)
    // Ensure the schema does not silently coerce
    if (bad.success === false) {
      expect(bad.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('project code patch enforces pattern', () => {
    expect(ProjectCodePatchSchema.safeParse('MDT').success).toBe(true)
    expect(ProjectCodePatchSchema.safeParse('A').success).toBe(false)
    expect(ProjectCodePatchSchema.safeParse('toolong').success).toBe(false)
    expect(ProjectCodePatchSchema.safeParse('123').success).toBe(false)
  })

  it('link boolean patch rejects non-booleans', () => {
    expect(LinkBooleanPatchSchema.safeParse(true).success).toBe(true)
    expect(LinkBooleanPatchSchema.safeParse(false).success).toBe(true)
    expect(LinkBooleanPatchSchema.safeParse('true').success).toBe(false)
    expect(LinkBooleanPatchSchema.safeParse(1).success).toBe(false)
  })

  it('user visibleCount rejects non-positive', () => {
    expect(ProjectSelectorVisibleCountPatchSchema.safeParse(7).success).toBe(true)
    expect(ProjectSelectorVisibleCountPatchSchema.safeParse(0).success).toBe(false)
    expect(ProjectSelectorVisibleCountPatchSchema.safeParse(-1).success).toBe(false)
  })

  it('strictPatchValidator returns the right schema per selector', () => {
    expect(strictPatchValidator('project.document.maxDepth')).toBe(DocumentMaxDepthPatchSchema)
    expect(strictPatchValidator('discovery.maxDepth')).toBe(DiscoveryMaxDepthPatchSchema)
  })

  it('strictPatchValidator throws for unregistered selector', () => {
    expect(() => strictPatchValidator('project.id')).toThrow(/No strict patch schema registered/)
  })
})
