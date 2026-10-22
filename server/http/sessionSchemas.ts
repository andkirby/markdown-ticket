import { OpaqueAccessIdSchema, ReadTokenCreateInputSchema, TokenCredentialSchema } from '@mdt/domain-contracts'

// REST-local envelopes over pure contract primitives; server has no Zod runtime
// dependency. Empty credential strings still reach credential verification.
const EnvelopeSchema = ReadTokenCreateInputSchema.pick({})
export const SubmittedTokenBodySchema = EnvelopeSchema.extend({ token: TokenCredentialSchema })
export const TokenIdParamsSchema = EnvelopeSchema.extend({ tokenId: OpaqueAccessIdSchema })
export const InviteCodeParamsSchema = EnvelopeSchema.extend({ code: OpaqueAccessIdSchema })
export const ShareParamsSchema = EnvelopeSchema.extend({ shareId: OpaqueAccessIdSchema })
