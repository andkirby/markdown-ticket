/**
 * Cloud command option DTOs (MDT-202 TASK-2 / ART-cli-cloud-options).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Module Boundaries.
 *
 * Pure types only. Parsing normalization lives in the commander option
 * declarations and the per-command action handlers; the typed request is what
 * crosses into shared services. No business logic here.
 */

import type { CloudPrincipalKind, ProjectMember } from '@mdt/domain-contracts'
import type { StructuredOutputOptions } from '../../output/structured.js'

/** Output options shared by every cloud subcommand. */
export interface CloudCommandOptions extends StructuredOutputOptions {}

/** Principal kind accepted by `members add/remove`. */
export const CLOUD_PRINCIPAL_KINDS: readonly CloudPrincipalKind[] = ['human', 'machine'] as const

/** Roles accepted by `members add`. Mirrors the domain ProjectRole set. */
export const CLOUD_MEMBER_ROLES: readonly ProjectMember['role'][] = ['viewer', 'contributor', 'owner'] as const

/** `cloud enable` request after option parsing. */
export interface EnableRequestDto {
  ownerEmail: string
}

/** `cloud connect` request. */
export interface ConnectRequestDto {
  cloudProjectId: string
}

/** `cloud members add` request. */
export interface MemberUpsertRequestDto {
  principal: string
  kind: CloudPrincipalKind
  role: ProjectMember['role']
  displayLabel?: string
}

/** `cloud members remove` request. */
export interface MemberRemoveRequestDto {
  principal: string
  kind: CloudPrincipalKind
}

/** `cloud credentials install` request. */
export interface CredentialInstallRequestDto {
  credentialRef: string
  clientId: string
  /** Secret read from stdin or hidden prompt — never argv. */
  clientSecret: string
}

/** `cloud credentials status` / `remove` request. */
export interface CredentialRefRequestDto {
  credentialRef: string
}

/** Confirmation flag common to destructive commands. */
export interface ConfirmationOptions {
  yes?: boolean
}
