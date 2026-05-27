import { z } from 'zod'

export const AccessModeSchema = z.enum([
  'unknown',
  'locked',
  'read-only',
  'owner-admin',
  'no-auth-dev',
  'backend-down',
])

export type AccessMode = z.infer<typeof AccessModeSchema>

export const RequestAccessModeSchema = z.enum([
  'anonymous',
  'read-only',
  'owner-admin',
  'no-auth-dev',
])

export type RequestAccessMode = z.infer<typeof RequestAccessModeSchema>

export const SessionStatusSchema = z.enum([
  'checking',
  'locked',
  'unlocking',
  'unlocked',
  'error',
])

export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const AuthCapabilitiesSchema = z.object({
  canWriteTickets: z.boolean(),
  canManageProjects: z.boolean(),
  canManageSharing: z.boolean(),
  canUseOwnerEndpoints: z.boolean(),
}).strict()

export type AuthCapabilities = z.infer<typeof AuthCapabilitiesSchema>

export const AuthAccessIndicatorSchema = z.enum([
  'none',
  'owner',
  'shared',
])

export type AuthAccessIndicator = z.infer<typeof AuthAccessIndicatorSchema>

export const PublicLinkOriginOptionsSchema = z.object({
  options: z.array(z.string()),
  selectedOrigin: z.string().optional(),
  notice: z.string().optional(),
}).strict()

export type PublicLinkOriginOptions = z.infer<typeof PublicLinkOriginOptionsSchema>

export const ReadTokenStatusSchema = z.enum(['active', 'expired', 'revoked'])

export type ReadTokenStatus = z.infer<typeof ReadTokenStatusSchema>

export const CreateReadTokenInputSchema = z.object({
  name: z.string(),
  projectRefs: z.array(z.string()),
  expiresAt: z.string().nullable().optional(),
}).strict()

export type CreateReadTokenInput = z.infer<typeof CreateReadTokenInputSchema>

export const ListedReadTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectRefs: z.array(z.string()),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  status: ReadTokenStatusSchema,
}).strict()

export type ListedReadToken = z.infer<typeof ListedReadTokenSchema>

export const ReadTokenCreationResponseSchema = ListedReadTokenSchema.extend({
  rawToken: z.string(),
}).strict()

export type ReadTokenCreationResponse = z.infer<typeof ReadTokenCreationResponseSchema>

export const ReadTokenListResponseSchema = z.object({
  tokens: z.array(ListedReadTokenSchema),
  linkOrigins: PublicLinkOriginOptionsSchema,
}).strict()

export type ReadTokenListResponse = z.infer<typeof ReadTokenListResponseSchema>

export const ReadTokenInviteResponseSchema = z.object({
  expiresAt: z.string(),
  inviteUrl: z.string(),
}).strict()

export type ReadTokenInviteResponse = z.infer<typeof ReadTokenInviteResponseSchema>

export const ReadTokenInviteSessionResponseSchema = z.object({
  authenticated: z.boolean(),
  projectRefs: z.array(z.string()),
}).strict()

export type ReadTokenInviteSessionResponse = z.infer<typeof ReadTokenInviteSessionResponseSchema>
