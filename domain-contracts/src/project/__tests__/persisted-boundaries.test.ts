import { PendingOperationFileSchema, PersistedTicketFrontmatterSchema, ProjectConfigReadFileSchema, ProjectConfigSchema, ProjectRegistrySharingFileSchema } from '../../index'

describe('MDT-258 persisted input differs deliberately from normalized/mutation contracts', () => {
  it('validates raw config without applying entity transforms or defaults', () => {
    const raw = { project: { name: 'Legacy', code: ' RAW ', startNumber: '002', document: { preview: {} } }, extension: true }
    expect(ProjectConfigSchema.parse(raw).project.code).toBe('RAW')
    expect(ProjectConfigSchema.parse(raw).project.document?.preview).toEqual({ allowedExternalDomains: [], allowUnsafeEval: false })
    expect(ProjectConfigReadFileSchema.parse(raw)).toEqual(raw)
  })
  it('collision scans retain share IDs despite invalid unrelated registry fields', () => {
    expect(ProjectRegistrySharingFileSchema.parse({ project: false, metadata: { globalOnly: 'invalid', sharing: { mode: 'future', shareId: 'existing-id' } } }).metadata?.sharing?.shareId).toBe('existing-id')
  })
  it('retains legacy frontmatter dates/relationships and falls back field by field', () => {
    const raw = { title: 'raw title', status: 'legacy-status', dependsOn: ['MDT-001', 2, ''], blocks: 'MDT-002, MDT-003', dateCreated: new Date('2026-01-01'), extension: { keep: true } }
    expect(PersistedTicketFrontmatterSchema.parse(raw)).toEqual(raw)
    expect(PersistedTicketFrontmatterSchema.parse({ code: 42, priority: {}, dependsOn: false })).toEqual({ code: undefined, priority: undefined, dependsOn: undefined })
  })
  it('stored drafts retain legacy strings instead of enforcing new-mutation policy', () => {
    const raw = { cloudProjectId: 'p', idempotencyKey: 'k', requestHash: 'h', operationId: 'op', state: 'pending', createdAt: 'legacy-date', updatedAt: 'legacy-date', draft: { crType: 'Legacy', data: { title: '', type: 'Legacy', priority: 'p1', extension: true } } }
    expect(PendingOperationFileSchema.parse(raw)).toEqual(raw)
  })
})
