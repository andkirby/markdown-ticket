import { describe, expect, it } from 'bun:test'
import { DevLogBatchSchema, DocumentFavInputSchema, FrontendLogBatchSchema, InviteInputSchema, PreviewTokenInputSchema, ReadTokenCreateInputSchema } from '../../app-config/input'
import { ConfigPatchEnvelopeSchema } from '../../config-management/input'
import { ConfigureDocumentsInputSchema, ProjectUpdateEnvelopeSchema, RegisterProjectInputSchema, UpdateProjectSharingInputSchema } from '../input'
import { ProjectConfigWriteFileSchema, ProjectDocumentWriteFileSchema, ProjectRegistryWriteFileSchema } from '../write-file'

describe('phase 2/3 boundary shapes', () => {
  it('keeps manager defaults and normalization out of registration parsing', () => {
    const input = { name: '  Alpha  ', path: './alpha', code: '', ticketsPath: '', globalOnly: false, createProjectPath: true, documentPaths: [], maxDepth: 0 }
    expect(RegisterProjectInputSchema.parse(input)).toEqual(input)
    expect(RegisterProjectInputSchema.parse({ name: 'Alpha', path: '/alpha' })).toEqual({ name: 'Alpha', path: '/alpha' })
  })
  it.each([null, [], false, { name: 1, path: '/a' }, { name: 'Alpha', path: [] }, { name: 'Alpha', path: '/a', globalOnly: 'true' }, { name: 'Alpha', path: '/a', documentPaths: [1] }, { name: 'Alpha', path: '/a', maxDepth: '3' }].map(input => [input]))('rejects registration shape %j', (input) => {
    expect(RegisterProjectInputSchema.safeParse(input).success).toBe(false)
  })
  it('allows no-op updates and enforces boolean active', () => {
    expect(ProjectUpdateEnvelopeSchema.parse({ ignored: 1 })).toEqual({})
    expect(ProjectUpdateEnvelopeSchema.parse({ active: false })).toEqual({ active: false })
    expect(ProjectUpdateEnvelopeSchema.safeParse({ active: 'false' }).success).toBe(false)
  })
  it('forbids client-supplied share IDs without changing sharing modes', () => {
    expect(UpdateProjectSharingInputSchema.parse({ mode: 'unlisted-readonly', rotateShareId: false })).toEqual({ mode: 'unlisted-readonly', rotateShareId: false })
    expect(UpdateProjectSharingInputSchema.safeParse({ mode: 'public-readonly', shareId: 'client-id' }).success).toBe(false)
  })
  it('composes the existing document path policy', () => {
    expect(ConfigureDocumentsInputSchema.parse({ projectId: 'opaque', documentPaths: [] }).documentPaths).toEqual([])
    expect(ConfigureDocumentsInputSchema.safeParse({ projectId: 'opaque', documentPaths: ['../bad'] }).success).toBe(false)
  })
  it('validates only the config envelope and preserves unknown value shapes for the selector validator', () => {
    expect(ConfigPatchEnvelopeSchema.parse({ selector: 'unknown.selector', value: { arbitrary: true } }).value).toEqual({ arbitrary: true })
    expect(ConfigPatchEnvelopeSchema.parse({ selector: 'x' })).toEqual({ selector: 'x' })
    expect(ConfigPatchEnvelopeSchema.safeParse({ selector: [] }).success).toBe(false)
  })
  it('keeps empty favorites and requires preview identifier strings', () => {
    expect(DocumentFavInputSchema.parse({ projectId: '', favItems: [] })).toEqual({ projectId: '', favItems: [] })
    expect(PreviewTokenInputSchema.safeParse({ projectId: 'p', filePath: [] }).success).toBe(false)
  })
  it('preserves absent invite bodies and nullable optional expiry', () => {
    expect(InviteInputSchema.parse(undefined)).toEqual({})
    expect(InviteInputSchema.safeParse(null).success).toBe(false)
    for (const expiresAt of [undefined, null, '', '2099-01-01']) {
      expect(ReadTokenCreateInputSchema.safeParse({ name: 'Guest', projectRefs: ['P'], expiresAt }).success).toBe(true)
    }
  })
  it.each([FrontendLogBatchSchema, DevLogBatchSchema])('rejects every malformed batch entry, preserving empty and extended batches', (schema) => {
    expect(schema.parse({})).toEqual({})
    expect(schema.parse({ logs: [] })).toEqual({ logs: [] })
    const entry = { timestamp: 1, level: 'custom', message: '', extension: { keep: true } }
    expect(schema.parse({ logs: [entry] })).toEqual({ logs: [entry] })
    for (const bad of [null, [], 'bad', {}, { ...entry, timestamp: '1' }, { ...entry, message: {} }, { ...entry, line: '1' }]) {
      expect(schema.safeParse({ logs: [entry, bad] }).success).toBe(false)
    }
  })
  it('preserves minimal/legacy write files without transforms, defaults or lost extensions', () => {
    const file = { project: { name: ' Legacy ', code: 'legacy', startNumber: '0042', document: { preview: {}, custom: true, maxDepth: 99 }, custom: 1 }, custom: { keep: true } }
    expect(ProjectConfigWriteFileSchema.parse(file)).toEqual(file)
    expect(ProjectDocumentWriteFileSchema.parse({})).toEqual({})
    expect(ProjectRegistryWriteFileSchema.parse({ project: { path: '/p' } })).toEqual({ project: { path: '/p' } })
  })
  it.each([null, [], { project: null }, { project: { active: 'yes' } }, { project: { document: { paths: [1] } } }, { project: { document: { preview: { allowUnsafeEval: 'false' } } } }].map(input => [input]))('rejects malformed write reload %j', (input) => {
    expect(ProjectConfigWriteFileSchema.safeParse(input).success).toBe(false)
  })
})
