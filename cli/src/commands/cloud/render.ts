/**
 * Cloud command output renderers (MDT-202 TASK-3 / ART-cli-cloud-render).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Redaction (C-5, C-6).
 *
 * Two responsibilities:
 *   1. Project every service result through an allow-list of fields so no
 *      secret, token, header, cookie, or JWT ever reaches stdout/stderr/JSON/YAML.
 *   2. Render human-readable text.
 *
 * Structured (JSON/YAML) output is produced by selecting fields into a plain
 * object and handing it to `writeStructuredSuccess`. The existing structured
 * serializer handles JSON/YAML; we never bypass it.
 *
 * Redaction invariants enforced here:
 *   - Credential diagnostics expose only `{ credentialRef, installed, clientId?, kind? }`.
 *     The secret is dropped by `MachineCredentialStore.describeLoaded` before
 *     we ever see it.
 *   - Probes, members, and connections expose only non-secret fields.
 *   - We never echo argv (the client secret is not in argv).
 */

import type {
  CloudConnectionDiagnostics,
  CloudSyncConnection,
  ConnectProjectResult,
  ProjectBindingProbe,
  ProjectMember,
  ProvisionProjectResult,
} from '@mdt/domain-contracts'
import type { MachineCredentialDiagnostic } from '@mdt/shared/services/cloud-sync/credential-store.js'

/** Redacted view of a connection record. */
function connectionView(conn: CloudSyncConnection | null): Record<string, unknown> | null {
  if (!conn) {
    return null
  }
  return {
    state: conn.state,
    cloudProjectId: conn.cloudProjectId,
    serviceOrigin: conn.serviceOrigin,
    pollIntervalSeconds: conn.pollIntervalSeconds,
  }
}

/** Redacted view of a readiness/diagnostics result. */
export function diagnosticsView(d: CloudConnectionDiagnostics): Record<string, unknown> {
  return {
    ready: d.ready,
    ...(d.reason ? { reason: d.reason } : {}),
    connection: connectionView(d.connection),
    probe: probeView(d.probe),
  }
}

/** Redacted view of a membership probe. */
function probeView(probe: ProjectBindingProbe | null): Record<string, unknown> | null {
  if (!probe) {
    return null
  }
  return {
    projectId: probe.projectId,
    projectCode: probe.projectCode,
    coordinationState: probe.coordinationState,
    role: probe.role,
  }
}

/** Redacted view of one project member. */
export function memberView(m: ProjectMember): Record<string, unknown> {
  return {
    kind: m.kind,
    id: m.id,
    displayLabel: m.displayLabel,
    role: m.role,
  }
}

/** Redacted view of a credential diagnostic (no secret ever present here). */
export function credentialView(c: MachineCredentialDiagnostic): Record<string, unknown> {
  return {
    credentialRef: c.credentialRef,
    installed: c.installed,
    ...(c.clientId ? { clientId: c.clientId } : {}),
    ...(c.kind ? { kind: c.kind } : {}),
  }
}

/** Redacted enable result. */
export function enableResultView(r: ProvisionProjectResult): Record<string, unknown> {
  return {
    cloudProjectId: r.cloudProjectId,
    replayed: r.replayed,
  }
}

/** Redacted connect result. */
export function connectResultView(r: ConnectProjectResult): Record<string, unknown> {
  return {
    cloudProjectId: r.cloudProjectId,
    role: r.role,
  }
}

/** Redacted disable result (the retained disabled connection). */
export function disableView(conn: CloudSyncConnection): Record<string, unknown> {
  return {
    state: conn.state,
    cloudProjectId: conn.cloudProjectId,
    serviceOrigin: conn.serviceOrigin,
    pollIntervalSeconds: conn.pollIntervalSeconds,
  }
}

// --- Human-readable text renderers -------------------------------------

/** Human text for `cloud status`. */
export function formatStatusHuman(d: CloudConnectionDiagnostics): string {
  if (!d.ready) {
    return `Cloud: not ready${d.reason ? ` — ${d.reason}` : ''}`
  }
  const conn = d.connection
  if (!conn) {
    return 'Cloud: local-only (no CONFIG_DIR connection)'
  }
  const probe = d.probe
  const probeSuffix = probe ? ` (coordination ${probe.coordinationState}, role ${probe.role})` : ''
  if (conn.state === 'disabled') {
    return `Cloud: disabled (fail-closed) — project ${conn.cloudProjectId}${probeSuffix}`
  }
  if (conn.state === 'enabled' && probe) {
    return `Cloud: enabled — project ${conn.cloudProjectId} @ ${conn.serviceOrigin}${probeSuffix}`
  }
  return `Cloud: ${conn.state} — project ${conn.cloudProjectId} @ ${conn.serviceOrigin}`
}

/** Human text for `cloud enable`. */
export function formatEnableHuman(r: ProvisionProjectResult): string {
  const note = r.replayed
    ? '(existing cloud project — no second provisioning)'
    : '(provisioned one new cloud project)'
  return `Cloud project ready: ${r.cloudProjectId} ${note}`
}

/** Human text for `cloud connect`. */
export function formatConnectHuman(r: ConnectProjectResult): string {
  return `Connected to cloud project ${r.cloudProjectId} as ${r.role}.`
}

/** Human text for `cloud login`. */
export function formatLoginHuman(): string {
  return 'Cloud: personal Access session obtained/refreshed. Connection state unchanged.'
}

/** Human text for `cloud doctor`. */
export function formatDoctorHuman(checks: { label: string, status: 'ok' | 'warn' | 'fail', detail?: string }[]): string {
  const lines = ['Cloud doctor:']
  for (const c of checks) {
    const tag = c.status === 'ok' ? 'OK  ' : c.status === 'warn' ? 'WARN' : 'FAIL'
    const detail = c.detail ? ` — ${c.detail}` : ''
    lines.push(`  [${tag}] ${c.label}${detail}`)
  }
  return lines.join('\n')
}

/** Human text for `cloud members list`. */
export function formatMembersListHuman(members: ProjectMember[]): string {
  if (members.length === 0) {
    return 'No project members.'
  }
  const rows = members.map(m => `  ${m.kind}\t${m.role}\t${m.id}\t${m.displayLabel}`)
  return ['Project members:', ...rows].join('\n')
}

/** Human text for `cloud members add`. */
export function formatMemberAddHuman(m: ProjectMember): string {
  return `Member ${m.id} (${m.kind}) is now ${m.role}.`
}

/** Human text for `cloud members remove`. */
export function formatMemberRemoveHuman(kind: string, principal: string): string {
  return `Member ${principal} (${kind}) removed.`
}

/** Human text for `cloud credentials install`. */
export function formatCredentialInstallHuman(ref: string, clientId: string): string {
  return `Credential ${ref} installed (clientId ${clientId}). Secret stored owner-only; never printed.`
}

/** Human text for `cloud credentials status`. */
export function formatCredentialStatusHuman(c: MachineCredentialDiagnostic): string {
  if (!c.installed) {
    return `Credential ${c.credentialRef}: not installed.`
  }
  return `Credential ${c.credentialRef}: installed (kind ${c.kind}, clientId ${c.clientId}). Secret redacted.`
}

/** Human text for `cloud credentials remove`. */
export function formatCredentialRemoveHuman(ref: string): string {
  return `Credential ${ref} removed.`
}

/** Human text for `cloud disable`. */
export function formatDisableHuman(conn: CloudSyncConnection): string {
  return `Cloud coordination disabled. Connection retained as ${conn.state} for project ${conn.cloudProjectId}; ticket creation stays fail-closed.`
}

/** Human text for `cloud migrate-legacy`. */
export function formatMigrateHuman(migrated: boolean, connection: CloudSyncConnection | null): string {
  if (!migrated) {
    return 'Legacy migration: nothing to migrate (no enabled legacy binding, or identical to current state).'
  }
  return `Legacy migration: imported CONFIG_DIR connection for project ${connection?.cloudProjectId ?? '?'}. Repository files unchanged.`
}
