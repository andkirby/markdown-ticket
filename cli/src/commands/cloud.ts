/**
 * mdt-cli cloud command group — thin presentation adapter
 * (MDT-202 TASK-4/5/6/7/8 / ART-cli-cloud).
 *
 * Source: docs/CRs/MDT-202/architecture.md § Module Boundaries + Runtime Flows.
 *
 * Every handler here only:
 *   - resolves the current project (BR-1.1);
 *   - parses argv into a typed request DTO;
 *   - confirms destructive operations;
 *   - delegates to the MDT-201 `CloudProjectManagementService` /
 *     `MachineCredentialStore`;
 *   - renders a redacted view (human/JSON/YAML).
 *
 * No allocation, membership, retry, binding, credential-storage, or
 * authorization logic lives here (C-2). Handlers throw; the cloud action
 * wrapper maps the error to one centralized exit code (C-7) and sets
 * `process.exitCode` — no inline `process.exit`.
 */

import type {
  CloudSyncConnection,
  ProjectCloudSyncBinding,
  ProjectMember,
} from '@mdt/domain-contracts'
import type { ManagementServiceHandle } from '@mdt/shared/services/cloud-sync/create-management-service.js'
import type { StructuredOutputOptions } from '../output/structured.js'
import type {
  CloudCommandOptions,
  ConfirmationOptions,
  ConnectRequestDto,
  CredentialInstallRequestDto,
  CredentialRefRequestDto,
  EnableRequestDto,
  MemberRemoveRequestDto,
  MemberUpsertRequestDto,
} from './cloud/options.js'
import { createHash } from 'node:crypto'
import process from 'node:process'
import {
  CliAudienceAwareCredentialProvider,
  computeInitialNextTicketNumber,
  createManagementService,
  repositoryLegacyMigrationSource,
} from '@mdt/shared/services/cloud-sync/create-management-service.js'
import {
  CloudflaredCredentialProvider,
  ServiceTokenCredentialProvider,
} from '@mdt/shared/services/cloud-sync/credential-providers.js'
import { MachineCredentialStore } from '@mdt/shared/services/cloud-sync/credential-store.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import {
  assertSingleOutputFormat,
  getOutputFormat,
  writeStructuredError,
  writeStructuredSuccess,
} from '../output/structured.js'
import { confirmDestructive } from './cloud/confirm.js'
import { CloudCommandError, CloudExitCode, exitCodeFor } from './cloud/exit-codes.js'
import { CLOUD_MEMBER_ROLES, CLOUD_PRINCIPAL_KINDS } from './cloud/options.js'
import {
  connectResultView,
  credentialView,
  diagnosticsView,
  disableView,
  enableResultView,
  formatConnectHuman,
  formatCredentialInstallHuman,
  formatCredentialRemoveHuman,
  formatCredentialStatusHuman,
  formatDisableHuman,
  formatDoctorHuman,
  formatEnableHuman,
  formatLoginHuman,
  formatMemberAddHuman,
  formatMemberRemoveHuman,
  formatMembersListHuman,
  formatMigrateHuman,
  formatStatusHuman,
  memberView,
} from './cloud/render.js'
import { readClientSecret } from './cloud/secret-prompt.js'

// ---------------------------------------------------------------------------
// Project context + service construction
// ---------------------------------------------------------------------------

interface ProjectContext {
  localProjectId: string
  projectCode: string
  projectPath: string
  operatorOrigins: string[]
  legacyCloudSyncBinding: ProjectCloudSyncBinding | null
}

/** Resolve the current project or throw NO_PROJECT_CONTEXT. */
async function requireProjectContext(): Promise<ProjectContext> {
  const projectService = new ProjectService(true)
  const result = await projectService.resolveCurrentProject()
  if (!result.data) {
    throw new CloudCommandError(
      'NO_PROJECT_CONTEXT',
      'No project context. Run from a configured project directory.',
      CloudExitCode.NO_PROJECT_CONTEXT,
    )
  }
  const projectConfig = projectService.getProjectConfig(result.data.project.path)
  const globalConfig = projectService.getGlobalConfig()
  return {
    localProjectId: result.data.id,
    projectCode: result.data.project.code,
    projectPath: result.data.project.path,
    operatorOrigins: globalConfig.cloudSync.allowedOrigins,
    legacyCloudSyncBinding: legacyCloudSyncBindingFromProjectConfig(projectConfig),
  }
}

function legacyCloudSyncBindingFromProjectConfig(config: unknown): ProjectCloudSyncBinding | null {
  const project = (config as { project?: { cloudSync?: unknown } } | null)?.project
  const binding = project?.cloudSync
  if (!binding || typeof binding !== 'object') {
    return null
  }
  return binding as ProjectCloudSyncBinding
}

/**
 * Build the management-service handle for the current project. Uses the real
 * cloudflared + service-token credential providers. Tests construct the
 * service directly via `createManagementService` (see shared/.../__tests__).
 */
async function buildHandle(ctx: ProjectContext): Promise<ManagementServiceHandle> {
  const provider = new CliAudienceAwareCredentialProvider({
    service: new ServiceTokenCredentialProvider(),
    human: new CloudflaredCredentialProvider(),
  })
  return createManagementService({
    localProjectId: ctx.localProjectId,
    projectCode: ctx.projectCode,
    initialOwnerEmail: '', // supplied per-enable
    operatorOrigins: ctx.operatorOrigins,
    credentialProvider: provider,
    legacyMigrationSource: repositoryLegacyMigrationSource(async () => ctx.legacyCloudSyncBinding),
  })
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function emit(
  options: CloudCommandOptions,
  command: string,
  data: unknown,
  meta: Record<string, unknown>,
  humanText: string,
): void {
  const format = getOutputFormat(options)
  if (format !== 'human') {
    writeStructuredSuccess(format, command, data, meta)
    return
  }
  console.log(humanText)
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/** `cloud enable --owner <email>` */
export async function cloudEnableAction(req: EnableRequestDto, options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()

  // Compute the start number from existing local tickets (shared logic, C-2).
  // Ticket.code is like "MDT-101"; parse the trailing integer.
  const ticketService = new TicketService()
  const read = await ticketService.listTickets({
    projectRef: ctx.projectCode,
    limit: Number.MAX_SAFE_INTEGER,
  })
  const numbers = (read.data ?? [])
    .map(t => Number.parseInt(t.code.split('-').pop() ?? '', 10))
    .filter(n => Number.isInteger(n))
  const initialNextTicketNumber = computeInitialNextTicketNumber(numbers)

  const handle = await buildHandle(ctx)
  // Deterministic key + hash so re-running enable for the same
  // project/owner/start-number produces the SAME idempotency key, letting the
  // coordinator replay the existing UUID instead of provisioning a second
  // project (BR-1.5 / Edge-6). A random per-invocation key would defeat
  // server-side idempotency on retry.
  const { idempotencyKey, requestHash } = enableIdempotencyTokens({
    projectCode: ctx.projectCode,
    ownerEmail: req.ownerEmail,
    initialNextTicketNumber,
  })

  const result = await handle.service.enable({
    projectCode: ctx.projectCode,
    initialOwnerEmail: req.ownerEmail,
    initialNextTicketNumber,
    idempotencyKey,
    requestHash,
  })

  emit(options, 'cloud.enable', enableResultView(result), { projectCode: ctx.projectCode }, formatEnableHuman(result))
}

/** `cloud login` */
export async function cloudLoginAction(options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)

  // Login obtains/refreshes the PERSONAL Access session by invoking the human
  // credential provider directly (architecture § cloud login). It must NOT go
  // through the audience-aware provider, which prefers an installed service
  // token — a machine identity, not a personal session. The resolved credential
  // is discarded; the side effect (cloudflared caches the session) is what
  // matters. Login writes NO connection state (BR-1.6).
  const humanProvider = new CloudflaredCredentialProvider()
  const credential = await humanProvider.resolve(handle.coordinationOrigin)
  if (!credential) {
    throw new CloudCommandError(
      'AUTHENTICATION_REQUIRED',
      'No personal Access session could be obtained. Run cloudflared login first.',
      CloudExitCode.AUTHENTICATION_REQUIRED,
    )
  }

  emit(options, 'cloud.login', { ok: true }, { projectCode: ctx.projectCode }, formatLoginHuman())
}

/** `cloud connect <cloud-project-uuid>` */
export async function cloudConnectAction(req: ConnectRequestDto, options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)

  const result = await handle.service.connect({ cloudProjectId: req.cloudProjectId })
  emit(options, 'cloud.connect', connectResultView(result), { projectCode: ctx.projectCode }, formatConnectHuman(result))
}

/** `cloud status` */
export async function cloudStatusAction(options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  const d = await handle.service.diagnostics()
  emit(options, 'cloud.status', diagnosticsView(d), { projectCode: ctx.projectCode }, formatStatusHuman(d))
}

/** `cloud doctor` */
export async function cloudDoctorAction(options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  const d = await handle.service.diagnostics()

  const checks: { label: string, status: 'ok' | 'warn' | 'fail', detail?: string }[] = []
  checks.push({ label: 'project context', status: 'ok', detail: `${ctx.projectCode} (${ctx.localProjectId})` })
  checks.push(d.connection
    ? { label: 'CONFIG_DIR connection', status: 'ok', detail: d.connection.state }
    : { label: 'CONFIG_DIR connection', status: 'warn', detail: 'absent (local-only)' })
  checks.push(d.ready
    ? { label: 'trusted origin', status: 'ok', detail: handle.coordinationOrigin }
    : { label: 'trusted origin', status: 'fail', detail: d.reason ?? 'not trusted' })
  checks.push(d.probe
    ? { label: 'membership probe', status: 'ok', detail: `role ${d.probe.role}` }
    : { label: 'membership probe', status: 'warn', detail: 'no probe (auth required or absent connection)' })

  emit(
    options,
    'cloud.doctor',
    { ...diagnosticsView(d), checks },
    { projectCode: ctx.projectCode },
    formatDoctorHuman(checks),
  )
}

// --- Members ------------------------------------------------------------

/** `cloud members list` */
export async function cloudMembersListAction(options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  const { items } = await handle.service.listMembers()
  emit(
    options,
    'cloud.members.list',
    { items: items.map(memberView), count: { total: items.length } },
    { projectCode: ctx.projectCode },
    formatMembersListHuman(items),
  )
}

/** `cloud members add <principal> --kind --role [--display-label]` */
export async function cloudMembersAddAction(req: MemberUpsertRequestDto, options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  if (!CLOUD_PRINCIPAL_KINDS.includes(req.kind)) {
    throw new CloudCommandError('INVALID_KIND', `--kind must be one of: ${CLOUD_PRINCIPAL_KINDS.join(', ')}`, CloudExitCode.CONFIG_INVALID)
  }
  if (!CLOUD_MEMBER_ROLES.includes(req.role)) {
    throw new CloudCommandError('INVALID_ROLE', `--role must be one of: ${CLOUD_MEMBER_ROLES.join(', ')}`, CloudExitCode.CONFIG_INVALID)
  }
  const displayLabel = req.displayLabel ?? req.principal
  const member: ProjectMember = await handle.service.upsertMember(req.kind, req.principal, {
    displayLabel,
    role: req.role,
  })
  emit(options, 'cloud.members.add', memberView(member), { projectCode: ctx.projectCode }, formatMemberAddHuman(member))
}

/** `cloud members remove <principal> --kind [--yes]` */
export async function cloudMembersRemoveAction(req: MemberRemoveRequestDto, options: CloudCommandOptions & ConfirmationOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  await confirmDestructive(`Remove member ${req.principal} (${req.kind}) from project ${ctx.projectCode}?`, options)
  await handle.service.removeMember(req.kind, req.principal)
  emit(options, 'cloud.members.remove', { removed: true, principal: req.principal, kind: req.kind }, { projectCode: ctx.projectCode }, formatMemberRemoveHuman(req.kind, req.principal))
}

// --- Credentials --------------------------------------------------------

function credentialStore(): MachineCredentialStore {
  return new MachineCredentialStore()
}

/** `cloud credentials install <ref> --client-id <id>` (secret via stdin/prompt) */
export async function cloudCredentialsInstallAction(
  req: Omit<CredentialInstallRequestDto, 'clientSecret'>,
  options: CloudCommandOptions,
): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const store = credentialStore()
  const clientSecret = await readClientSecret()
  await store.install(req.credentialRef, {
    version: 1,
    kind: 'cloudflare-service-token',
    clientId: req.clientId,
    clientSecret,
  })
  const diag = store.describeLoaded(
    { version: 1, kind: 'cloudflare-service-token', clientId: req.clientId, clientSecret: '' },
    req.credentialRef,
  )
  emit(
    options,
    'cloud.credentials.install',
    credentialView(diag),
    { projectCode: ctx.projectCode },
    formatCredentialInstallHuman(req.credentialRef, req.clientId),
  )
}

/** `cloud credentials status <ref>` */
export async function cloudCredentialsStatusAction(req: CredentialRefRequestDto, options: CloudCommandOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const store = credentialStore()
  const record = await store.load(req.credentialRef)
  const diag = record
    ? store.describeLoaded(record, req.credentialRef)
    : store.describe(req.credentialRef)
  emit(options, 'cloud.credentials.status', credentialView(diag), { projectCode: ctx.projectCode }, formatCredentialStatusHuman(diag))
}

/** `cloud credentials remove <ref> [--yes]` */
export async function cloudCredentialsRemoveAction(req: CredentialRefRequestDto, options: CloudCommandOptions & ConfirmationOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const store = credentialStore()
  await confirmDestructive(`Remove credential ${req.credentialRef} from the owner-only store?`, options)
  await store.remove(req.credentialRef)
  emit(options, 'cloud.credentials.remove', { removed: true, credentialRef: req.credentialRef }, { projectCode: ctx.projectCode }, formatCredentialRemoveHuman(req.credentialRef))
}

// --- Disable / migrate --------------------------------------------------

/** `cloud disable [--yes]` */
export async function cloudDisableAction(options: CloudCommandOptions & ConfirmationOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  await confirmDestructive(`Disable cloud coordination for project ${ctx.projectCode}? Ticket creation will remain fail-closed.`, options)
  const conn: CloudSyncConnection = await handle.service.disable()
  emit(options, 'cloud.disable', disableView(conn), { projectCode: ctx.projectCode }, formatDisableHuman(conn))
}

/** `cloud migrate-legacy [--yes]` */
export async function cloudMigrateLegacyAction(options: CloudCommandOptions & ConfirmationOptions): Promise<void> {
  assertSingleOutputFormat(options)
  const ctx = await requireProjectContext()
  const handle = await buildHandle(ctx)
  await confirmDestructive(`Import the legacy repository [project.cloudSync] binding into CONFIG_DIR for project ${ctx.projectCode}?`, options)
  const result = await handle.service.migrateLegacyBinding()
  emit(options, 'cloud.migrate-legacy', { migrated: result.migrated, connection: result.connection }, { projectCode: ctx.projectCode }, formatMigrateHuman(result.migrated, result.connection))
}

// ---------------------------------------------------------------------------
// Cloud action wrapper — one centralized exit-code mapping (C-7)
// ---------------------------------------------------------------------------

/**
 * Wrap a cloud action so failures map through {@link exitCodeFor} and set
 * `process.exitCode`. No handler calls `process.exit` inline.
 *
 * Structured-output errors are written to stderr via `writeStructuredError`;
 * human errors go to stderr as `Error: <message>`.
 */
export async function runCloudAction(
  commandName: string,
  options: StructuredOutputOptions,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action()
  }
  catch (error) {
    const code = exitCodeFor(error)
    process.exitCode = code
    if (options.json || options.yaml) {
      const format = options.json ? 'json' : 'yaml'
      writeStructuredError(format, commandName, error)
    }
    else {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${message}`)
    }
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Derive the deterministic provisioning idempotency key + request hash for
 * `cloud enable` (BR-1.5 / Edge-6). Identical inputs MUST yield identical
 * tokens so the coordinator replays the same UUID on retry instead of
 * provisioning a second project. Exported for a regression test that locks
 * the determinism invariant.
 */
export function enableIdempotencyTokens(input: {
  projectCode: string
  ownerEmail: string
  initialNextTicketNumber: number
}): { idempotencyKey: string, requestHash: string } {
  const requestHash = sha256(`${input.projectCode}|${input.ownerEmail}|${input.initialNextTicketNumber}`)
  return {
    requestHash,
    idempotencyKey: sha256(`idem|${requestHash}`),
  }
}
