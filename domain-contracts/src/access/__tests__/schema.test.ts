import {
  AccessModeSchema,
  AuthAccessIndicatorSchema,
  AuthCapabilitiesSchema,
  ListedReadTokenSchema,
  PublicLinkOriginOptionsSchema,
  ReadTokenCreationResponseSchema,
  ReadTokenInviteResponseSchema,
  ReadTokenListResponseSchema,
} from '../schema'

describe('access contracts', () => {
  it('accepts shared access vocabulary and capability flags', () => {
    expect(AccessModeSchema.parse('read-only')).toBe('read-only')
    expect(AuthAccessIndicatorSchema.parse('shared')).toBe('shared')
    expect(AuthCapabilitiesSchema.parse({
      canWriteTickets: false,
      canManageProjects: false,
      canManageSharing: false,
      canUseOwnerEndpoints: false,
    })).toMatchObject({ canUseOwnerEndpoints: false })
  })

  it('accepts public link origin options', () => {
    expect(PublicLinkOriginOptionsSchema.parse({
      options: ['https://share.example.com'],
      selectedOrigin: 'https://share.example.com',
    })).toEqual({
      options: ['https://share.example.com'],
      selectedOrigin: 'https://share.example.com',
    })
  })

  it('accepts read-token management API DTOs', () => {
    const listed = ListedReadTokenSchema.parse({
      id: 'rtok_123',
      name: 'Bob',
      projectRefs: ['MDT', 'DOCS'],
      expiresAt: null,
      createdAt: '2026-05-24T00:00:00.000Z',
      revokedAt: null,
      status: 'active',
    })

    expect(ReadTokenCreationResponseSchema.parse({
      ...listed,
      rawToken: 'secret-once',
    }).rawToken).toBe('secret-once')

    expect(ReadTokenListResponseSchema.parse({
      tokens: [listed],
      linkOrigins: { options: [] },
    }).tokens).toHaveLength(1)

    expect(ReadTokenInviteResponseSchema.parse({
      expiresAt: '2026-05-24T00:15:00.000Z',
      inviteUrl: 'https://share.example.com/invite/code',
    }).inviteUrl).toContain('/invite/')
  })
})
