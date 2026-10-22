import * as access from '../access/schema'
import * as appConfig from '../app-config/schema'
import * as patches from '../config-management/patch-schemas'
import * as config from '../config/schema'
import * as projectContracts from '../project/schema'
import * as worktree from '../project/worktree'
import * as search from '../search/schema'
import * as ticketSearch from '../ticket/search'

const contracts = { ...access, ...appConfig, ...config, ...patches, ...projectContracts, ...worktree, ...search, ...ticketSearch }

const project = { code: 'MDT', name: 'Markdown Ticket' }
const runtime = {
  ...project,
  id: 'markdown-ticket',
  path: '/repo',
  configFile: '.mdt-config.toml',
  active: true,
  description: '',
  repository: '',
  ticketsPath: 'docs/CRs',
}
const metadata = { dateRegistered: '2026-10-22', lastAccessed: '2026-10-22', version: '1' }
const timestamp = '2026-10-22T12:30:00Z'
const token = { id: '1', name: 'Reader', projectRefs: [], expiresAt: null, createdAt: timestamp, revokedAt: null, status: 'active' }
const strictCases = [
  ['AuthCapabilitiesSchema', { canWriteTickets: true, canManageProjects: true, canManageSharing: true, canUseOwnerEndpoints: true }],
  ['PublicLinkOriginOptionsSchema', { options: [] }],
  ['CreateReadTokenInputSchema', { name: 'Reader', projectRefs: [] }],
  ['ListedReadTokenSchema', token],
  ['ReadTokenCreationResponseSchema', { ...token, rawToken: 'secret' }],
  ['ReadTokenListResponseSchema', { tokens: [], linkOrigins: { options: [] } }],
  ['ReadTokenInviteResponseSchema', { expiresAt: timestamp, inviteUrl: 'https://example.com' }],
  ['ReadTokenInviteSessionResponseSchema', { authenticated: true, projectRefs: [] }],
  ['DocumentFavItemSchema', { path: 'docs/a.md', type: 'file', favoritedAt: timestamp }],
  ['DocumentFavStateSchema', { favItems: [] }],
  ['PinItemSchema', { projectCode: 'MDT', ticketCode: 'MDT-259', favoritedAt: timestamp }],
  ['PinStateSchema', { pins: [] }],
  ['WorktreeEntrySchema', { ticketCode: 'MDT-259', path: '/repo' }],
  ['WorktreeInfoSchema', { ticketCode: 'MDT-259', path: '/repo', exists: true, hasTicketFile: true }],
  ['WorktreeConfigSchema', {}],
  ['DocumentConfigSchema', {}],
  ['ProjectDocumentSettingsSchema', {}],
  ['ProjectSharingSettingsSchema', {}],
  ['ProjectDetailsSchema', { ...project, id: 'markdown-ticket', ticketsPath: 'docs/CRs' }],
  ['LocalProjectConfigProjectSchema', project],
  ['LocalProjectConfigSchema', { project }],
  ['ProjectRuntimeFieldsSchema', runtime],
  ['ProjectMetadataSchema', metadata],
  ['ProjectSchema', { id: 'markdown-ticket', project: runtime, metadata }],
  ['ProjectRegistryProjectSchema', { path: '/repo' }],
  ['ProjectRegistryEntrySchema', { project: { path: '/repo' }, metadata }],
  ['CreateProjectInputSchema', { ...project, id: 'markdown-ticket', ticketsPath: 'docs/CRs' }],
  ['UpdateProjectInputSchema', { name: 'Markdown Ticket' }],
] as const

describe('Zod migration compatibility', () => {
  it.each(strictCases)('%s still rejects unknown keys', (name, valid) => {
    const schema = contracts[name]
    expect(schema.safeParse(valid).success).toBe(true)
    const result = schema.safeParse({ ...valid, unexpected: true })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unrecognized_keys', keys: ['unexpected'] }),
      ]))
    }
  })

  it('keeps nested ticket settings strict and tolerant cloud settings reset on extra keys', () => {
    expect(contracts.ProjectSchema.safeParse({ id: 'markdown-ticket', project: runtime, metadata, tickets: { unexpected: true } }).success).toBe(false)
    expect(contracts.GlobalCloudSyncConfigSchema.parse({ allowedOrigins: ['https://example.com'], unexpected: true })).toEqual({ allowedOrigins: [] })
  })

  it.each(['trace', '', null, 123])('keeps the configured log-level error for %p', (logLevel) => {
    const result = contracts.ServerConfigSchema.safeParse({ logLevel })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ['logLevel'], message: 'Log level must be one of: debug, info, warn, error' })
    }
    expect(contracts.ServerConfigSchema.parse({})).toEqual({})
    expect(contracts.ServerConfigSchema.parse({ logLevel: undefined })).toEqual({ logLevel: undefined })
  })

  it('preserves partial document settings without applying omitted defaults', () => {
    for (const input of [{}, { paths: [] }, { maxDepth: 2 }, { paths: undefined }]) {
      expect(contracts.ProjectDocumentSettingsSchema.parse(input)).toEqual(input)
    }
    expect(contracts.ProjectDocumentSettingsSchema.parse({ preview: {} })).toEqual({ preview: { allowedExternalDomains: [], allowUnsafeEval: false } })
    expect(contracts.ProjectConfigSchema.parse({ project, document: {} })).toEqual({ project, document: {} })
    expect(contracts.ProjectConfigSchema.parse({ project: { ...project, startNumber: '7', custom: true }, extra: 1 })).toEqual({ project: { ...project, startNumber: '7', custom: true }, extra: 1 })
  })

  it('preserves selector record defaults, normalization and invalid-entry rejections', () => {
    expect(contracts.SelectorStateSchema.parse(undefined)).toEqual({})
    expect(contracts.SelectorStateSchema.parse({ MDT: { accent: '#ABCDEF' } })).toEqual({ MDT: { favorite: false, lastUsedAt: null, count: 0, accent: '#abcdef' } })
    expect(contracts.SelectorStateSchema.parse({ MDT: { favorite: 'bad', count: -1, lastUsedAt: 'bad' } })).toEqual({ MDT: { favorite: false, lastUsedAt: null, count: 0 } })
    for (const input of [null, [], { MDT: null }, { MDT: { accent: '#bad' } }]) {
      expect(contracts.SelectorStateSchema.safeParse(input).success).toBe(false)
    }
  })

  it('returns independent nested defaults on repeated config parses', () => {
    const first = contracts.GlobalConfigSchema.parse(undefined)
    first.discovery.searchPaths.push('/mutated')
    first.cloudSync.allowedOrigins.push('https://mutated.example')
    const second = contracts.GlobalConfigSchema.parse(undefined)
    expect(second.discovery.searchPaths).toEqual([])
    expect(second.cloudSync.allowedOrigins).toEqual([])
    const user = contracts.UserConfigSchema.parse(undefined)
    user.ui.projectSelector.visibleCount = 99
    expect(contracts.UserConfigSchema.parse(undefined).ui.projectSelector.visibleCount).toBe(7)
  })

  it.each([
    '2026-10-22T12:30Z',
    '2026-10-22T12:30:00Z',
    '2026-10-22T12:30:00.123Z',
    '2026-10-22T12:30:00+0200',
    '2026-10-22T12:30:00+02:00',
    '2026-10-22T12:30:00+99:99',
  ])('preserves the existing persisted timestamp grammar: %s', (favoritedAt) => {
    expect(contracts.DocumentFavItemSchema.parse({ path: 'docs/a.md', type: 'file', favoritedAt }).favoritedAt).toBe(favoritedAt)
    expect(contracts.SelectorStateEntrySchema.parse({ lastUsedAt: favoritedAt }).lastUsedAt).toBe(favoritedAt)
  })

  it.each(['2026-02-30T12:30:00Z', '2026-10-22T24:00:00Z', '2026-10-22', 'bad'])('continues rejecting invalid persisted timestamps: %s', (favoritedAt) => {
    expect(contracts.DocumentFavItemSchema.safeParse({ path: 'docs/a.md', type: 'file', favoritedAt }).success).toBe(false)
    expect(contracts.SelectorStateEntrySchema.parse({ lastUsedAt: favoritedAt }).lastUsedAt).toBeNull()
  })

  it('preserves unbounded integer values without accepting fractions or infinity', () => {
    const large = Number.MAX_SAFE_INTEGER + 1
    for (const schema of [contracts.StartNumberSchema, contracts.SystemCacheTimeoutPatchSchema, contracts.ProjectSelectorVisibleCountPatchSchema]) {
      expect(schema.parse(large)).toBe(large)
      for (const invalid of [1.5, Infinity, Number.NaN, -1]) expect(schema.safeParse(invalid).success).toBe(false)
    }
    expect(contracts.GlobalConfigSchema.parse({ system: { cacheTimeout: large } }).system.cacheTimeout).toBe(large)
    expect(contracts.SelectorPreferencesSchema.parse({ visibleCount: large }).visibleCount).toBe(large)
    expect(contracts.SelectorStateEntrySchema.parse({ count: large }).count).toBe(large)
    expect(contracts.SearchResponseSchema.parse({ results: [], total: large }).total).toBe(large)
    expect(contracts.UnifiedSearchResponseSchema.parse({ results: [], groups: [], total: large }).total).toBe(large)
  })
})
