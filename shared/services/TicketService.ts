import type {
  CloudCredentialProvider,
  CloudSyncCoordinator,
  CreationRecoveryInspection,
  CreationRecoveryOutcome,
  CreationRecoveryReconcileInput,
  CreationRecoveryResumeInput,
  ProjectCloudSyncBinding,
  ProjectConnectionRead,
  ProjectedHeader,
  TicketClaimResponse,
  TicketCreationResult,
  TicketIdentityDiagnostic,
} from '@mdt/domain-contracts'
import type { Project } from '../models/Project.js'
import type {
  Ticket,
  TicketData,
} from '../models/Ticket.js'
/**
 * Shared Ticket Service - Consolidated CRUD Operations
 * Single source of truth for ticket/CR management across MCP server and web server
 * Migrated from mcp-server/src/services/crService.ts per MDT-082
 */

import type { PendingOperation } from './cloud-sync/operation-journal.js'
import type { ProjectionClientPort } from './cloud-sync/projection-sync.js'
import type { TicketRepository } from './ticket/TicketRepository.js'

import { createHash } from 'node:crypto'
import { readdir, realpath } from 'node:fs/promises'
import * as path from 'node:path'
import {
  CanonicalProjectCodeSchema,
  CoordinatorError,
  CRStatus as CRStatusEnum,
} from '@mdt/domain-contracts'
import fs from 'fs-extra'

import { getDefaultPaths } from '../utils/constants.js'
import { formatCrKey } from '../utils/keyNormalizer.js'
import { logQuiet } from '../utils/logger.js'
import { bindingFromEnabledConnection } from './cloud-sync/allocator-strategy.js'
import { CloudProjectionClient as HttpCloudProjectionClient } from './cloud-sync/CloudProjectionClient.js'
import { CloudSyncCoordinator as HttpCloudSyncCoordinator } from './cloud-sync/CloudSyncCoordinator.js'
import { buildEffectiveCloudSyncConfig } from './cloud-sync/config.js'
import {
  CloudCreateOrchestrator,
  projectedHeaderHash,
} from './cloud-sync/create-orchestrator.js'
import { CreationRecoveryService } from './cloud-sync/creation-recovery.js'
import { RuntimeCloudCredentialProvider } from './cloud-sync/credential-providers.js'
import { CloudOperationJournal } from './cloud-sync/operation-journal.js'
import { ProjectStateStore } from './cloud-sync/project-state-store.js'
import { CloudProjectionSync } from './cloud-sync/projection-sync.js'
import { RecoveryRunner } from './cloud-sync/recovery.js'
import { resolveTrustedServiceProfile } from './cloud-sync/trusted-service-profile.js'
import { CRService as SharedCRService } from './CRService.js'

import { ProjectService } from './ProjectService.js'
import { ServiceError } from './ServiceError.js'
import { TemplateService } from './TemplateService.js'
import { buildCreationDiagnostics } from './ticket/content-inspection.js'
import { MarkdownTicketRepository } from './ticket/MarkdownTicketRepository.js'
import { mutateReferences } from './ticket/referenceMutations.js'
import { assertSafeTicketInventory, assertUnambiguousTicket, classifyTicketIdentity, repositoryRoots, TicketIdentityConflictError } from './ticket/TicketIdentityService.js'
import { TicketLocationResolver } from './ticket/TicketLocationResolver.js'
import { TicketMutationService } from './ticket/TicketMutationService.js'
import { TicketQueryService } from './ticket/TicketQueryService.js'

/**
 * A cloud coordinator + credential provider for one TicketService instance.
 * Production defaults to the HTTP clients and runtime credential provider;
 * callers may inject deterministic alternatives for tests. Missing credentials
 * and coordinator failures remain fail-closed (BR-1.5).
 */
export interface CloudRuntimeDependencies {
  credentialProvider?: CloudCredentialProvider
  nonInteractiveCredentialProvider?: CloudCredentialProvider
  coordinatorFactory?: (
    binding: ProjectCloudSyncBinding,
  ) => CloudSyncCoordinator
  projectionClientFactory?: (
    binding: ProjectCloudSyncBinding,
  ) => ProjectionClientPort
  journalRoot?: string
  /**
   * CONFIG_DIR root for the cloud connection store
   * (`{root}/projects/{projectId}/cloud-sync.toml`). Defaults to
   * `getDefaultPaths().CONFIG_DIR`. Injected by tests to point at a temp dir.
   */
  stateStoreRoot?: string
}

/**
 * Case-insensitive substring match for fuzzy filtering.
 * An empty pattern matches everything.
 */
/**
 * Unified Ticket Service for CRUD Operations
 * Provides ticket management functionality for both MCP and web servers
 *
 * MDT-095: Enhanced with worktree support - TicketService is now the single
 * source of truth for worktree path resolution, replacing the workaround in
 * mcp-server/src/tools/handlers/crHandlers.ts
 */
export class TicketService {
  private readonly repository: TicketRepository
  private readonly queries: TicketQueryService
  private readonly mutations: TicketMutationService
  listTickets(...args: Parameters<TicketQueryService['listTickets']>): ReturnType<TicketQueryService['listTickets']> { return this.queries.listTickets(...args) }
  getTicket(...args: Parameters<TicketQueryService['getTicket']>): ReturnType<TicketQueryService['getTicket']> { return this.queries.getTicket(...args) }
  getCRPath(...args: Parameters<TicketQueryService['getCRPath']>): ReturnType<TicketQueryService['getCRPath']> { return this.queries.getCRPath(...args) }
  listCRs(...args: Parameters<TicketQueryService['listCRs']>): ReturnType<TicketQueryService['listCRs']> { return this.queries.listCRs(...args) }
  getCR(...args: Parameters<TicketQueryService['getCR']>): ReturnType<TicketQueryService['getCR']> { return this.queries.getCR(...args) }
  private withExternalReferences(...args: Parameters<TicketQueryService['withExternalReferences']>): ReturnType<TicketQueryService['withExternalReferences']> { return this.queries.withExternalReferences(...args) }
  updateTicketAttributes(...args: Parameters<TicketMutationService['updateTicketAttributes']>): ReturnType<TicketMutationService['updateTicketAttributes']> { return this.mutations.updateTicketAttributes(...args) }
  updateCRStatus(...args: Parameters<TicketMutationService['updateCRStatus']>): ReturnType<TicketMutationService['updateCRStatus']> { return this.mutations.updateCRStatus(...args) }
  updateCRAttrs(...args: Parameters<TicketMutationService['updateCRAttrs']>): ReturnType<TicketMutationService['updateCRAttrs']> { return this.mutations.updateCRAttrs(...args) }
  updateCRPartial(...args: Parameters<TicketMutationService['updateCRPartial']>): ReturnType<TicketMutationService['updateCRPartial']> { return this.mutations.updateCRPartial(...args) }
  private assertPhaseEpicTarget(...args: Parameters<TicketMutationService['assertPhaseEpicTarget']>): ReturnType<TicketMutationService['assertPhaseEpicTarget']> { return this.mutations.assertPhaseEpicTarget(...args) }
  private referenceTrackers(project: Project): unknown { return this.projectService.getProjectConfig(project.project.path)?.trackers }

  private projectService: ProjectService
  private templateService: TemplateService
  private readonly ticketLocationResolver: TicketLocationResolver
  private readonly quiet: boolean
  private readonly cloudRuntime: CloudRuntimeDependencies
  private readonly identityObservationOffsets = new Map<string, number>()
  private readonly identityObservationProofs = new Map<string, { context: string, entries: Map<string, { signature: string, diagnostic: TicketIdentityDiagnostic }> }>()

  constructor(
    quiet: boolean = false,
    cloudRuntime: CloudRuntimeDependencies = {},
  ) {
    this.projectService = new ProjectService(quiet)
    this.templateService = new TemplateService(undefined, quiet)
    this.ticketLocationResolver = new TicketLocationResolver(
      this.projectService,
    )
    this.quiet = quiet
    this.cloudRuntime = cloudRuntime
    const configLookup = { getProjectConfig: (p: string) => this.projectService.getProjectConfig(p) }
    this.repository = new MarkdownTicketRepository(configLookup, { getTemplate: type => this.templateService.getTemplate(type) })
    this.queries = new TicketQueryService({ ...configLookup, getProject: ref => this.projectService.getProject(ref), getProjectCRs: project => this.projectService.getProjectCRs(project) }, this.ticketLocationResolver, this.repository)
    this.mutations = new TicketMutationService({ ...configLookup, getProject: ref => this.projectService.getProject(ref), getProjectByCodeOrId: ref => this.projectService.getProjectByCodeOrId(ref) }, { getCR: (project, key) => this.getCR(project, key) }, this.ticketLocationResolver, this.repository, (...args) => this.syncTicketProjectionBestEffort(...args))
  }

  async pollCloudProjections(
    project: Project,
    after = 0,
    limit = 100,
  ): Promise<{
    enabled: boolean
    pollIntervalSeconds: number
    items: Array<ProjectedHeader & { ticketNumber: number, lifecycle: string }>
    nextCursor: number | null
    hasMore: boolean
    stale: boolean
    error?: string
  }> {
    try {
      const connection = await this.resolveCloudConnection(project)
      if (connection.kind === 'absent') {
        return {
          enabled: false,
          pollIntervalSeconds: 15,
          items: [],
          nextCursor: null,
          hasMore: false,
          stale: false,
        }
      }
      if (connection.kind !== 'enabled') {
        // disabled / malformed / untrusted: honest fail-closed. Do NOT report
        // enabled:false (that would lie about cloud being off) and do NOT fall
        // back to local polling (BR-4.2).
        return {
          enabled: true,
          pollIntervalSeconds: 15,
          items: [],
          nextCursor: after,
          hasMore: false,
          stale: true,
          error: 'coordination_suspended',
        }
      }
      const binding = bindingFromEnabledConnection(connection.connection)
      const effectiveConfig = buildEffectiveCloudSyncConfig(
        this.projectService.getGlobalConfig().cloudSync,
      )
      const credentialProvider
        = this.cloudRuntime.credentialProvider
          ?? new RuntimeCloudCredentialProvider()
      const credential = await credentialProvider.resolve(binding.serviceUrl)
      if (!credential) {
        return {
          enabled: true,
          pollIntervalSeconds: binding.pollIntervalSeconds,
          items: [],
          nextCursor: after,
          hasMore: false,
          stale: true,
          error: 'authentication_required',
        }
      }
      const client
        = this.cloudRuntime.projectionClientFactory?.(binding)
          ?? new HttpCloudProjectionClient(
            {
              serviceUrl: binding.serviceUrl,
              globalConfig: effectiveConfig,
            },
            binding.projectId,
            after,
          )
      // MDT-226: the write journal is NOT drained on the read path. Coupling
      // retry to every read poll caused a per-ticket read amplification loop for
      // stuck entries. The journal flushes through its own bounded lifecycle.
      const result = await client.poll(credential, limit)
      return {
        enabled: true,
        pollIntervalSeconds: binding.pollIntervalSeconds,
        items: result.items.map(item => ({
          ticketNumber: item.ticketNumber,
          lifecycle: item.lifecycle,
          code: item.code,
          title: item.title,
          status: item.status,
          type: item.type,
          priority: item.priority,
          assignee: item.assignee,
          date_created: item.date_created,
          last_modified: item.last_modified,
        })),
        nextCursor: result.nextCursor ?? after,
        hasMore: result.hasMore,
        stale: false,
      }
    }
    catch (error) {
      return {
        enabled: true,
        pollIntervalSeconds: 15,
        items: [],
        nextCursor: after,
        hasMore: false,
        stale: true,
        error:
          error instanceof CoordinatorError
            ? error.code
            : 'coordination_unavailable',
      }
    }
  }

  /**
   * Create a new CR in a project
   * MDT-095: Enhanced with worktree support - creates in worktree if branch exists
   * MDT-200: local projects keep filesystem allocation; cloud-bound projects
   * execute the durable reserve → write → acknowledge orchestration.
   *   - Local project (no CONFIG_DIR cloud connection): identical highest+1
   *     filesystem scan, byte-for-byte (BR-1.7, BR-5.1).
   *   - Enabled CONFIG_DIR connection uses the production HTTP coordinator and
   *     runtime credentials by default; missing credentials or cloud failure
   *     never allocate a local number (BR-1.5).
   *   - Disabled / malformed / untrusted connection: fail closed (BR-4.2). A
   *     disabled connection never resumes local numbering.
   */
  async createCR(
    project: Project,
    crType: string,
    data: TicketData,
  ): Promise<Ticket> {
    return (await this.createCRWithDiagnostics(project, crType, data)).ticket
  }

  /** Successful creation plus non-persisted operation diagnostics (MDT-261). */
  async createCRWithDiagnostics(
    project: Project,
    crType: string,
    data: TicketData,
  ): Promise<TicketCreationResult> {
    if (data.refs !== undefined)
      data = { ...data, refs: mutateReferences([], { field: 'refs', op: 'replace', value: data.refs }, this.referenceTrackers(project)) }
    let bodySource: 'generated' | 'supplied' | 'recovered' = 'recovered'
    const onBodySource = (source: 'generated' | 'supplied'): void => {
      bodySource = source
    }
    const finish = (ticket: Ticket): TicketCreationResult => ({
      ticket: this.withExternalReferences(project, ticket),
      diagnostics: buildCreationDiagnostics(ticket, bodySource),
    })
    try {
      // MDT-205: validate a key-shaped phaseEpic target on create too.
      await this.assertPhaseEpicTarget(project, data.phaseEpic)

      const connection = await this.resolveCloudConnection(project)
      if (connection.kind === 'absent') {
        return finish(await this.createLocalTicketWithNumber(
          project,
          crType,
          data,
          await this.getNextCRNumber(project),
          undefined,
          false,
          undefined,
          onBodySource,
        ))
      }
      if (connection.kind !== 'enabled') {
        // disabled / malformed / untrusted: fail closed (BR-4.2, BR-1.6). A
        // disabled or invalid connection MUST NOT resume local numbering.
        throw new CoordinatorError('coordination_suspended', {
          message: `cloud connection is ${connection.kind}`,
        })
      }
      project = this.canonicalCloudProject(project)
      const binding = bindingFromEnabledConnection(connection.connection)
      const inventory = await this.readIdentityInventory(project)
      assertSafeTicketInventory(inventory)

      const globalConfig = this.projectService.getGlobalConfig()
      const effectiveConfig = buildEffectiveCloudSyncConfig(
        globalConfig.cloudSync,
      )
      const journal = new CloudOperationJournal({
        rootDir:
          this.cloudRuntime.journalRoot
          ?? path.join(getDefaultPaths().CONFIG_DIR, 'cloud-sync', 'journals'),
        physicalRepoPath: inventory.physicalRepoPath,
        legacyPhysicalRepoPaths: [project.project.path, ...inventory.roots],
      })
      const orchestrator = new CloudCreateOrchestrator({
        binding,
        allowedOrigins: effectiveConfig.allowedOrigins,
        journal,
        credentialProvider:
          this.cloudRuntime.credentialProvider
          ?? new RuntimeCloudCredentialProvider(),
        coordinator: this.cloudRuntime.coordinatorFactory?.(binding),
      })
      const ticket = await orchestrator.create({
        crType,
        data,
        minimumTicketNumber: Math.max(inventory.minimumTicketNumber, project.project.startNumber || 1),
        verifyLocal: (ticketNumber, creationId) => this.verifyCloudCreation(project, ticketNumber, creationId),
        writeLocal: async (ticketNumber, createdAt, draft, creationId) => {
          const ticket = await this.createLocalTicketWithNumber(
            project,
            draft.crType,
            draft.data,
            ticketNumber,
            createdAt,
            true,
            creationId,
            onBodySource,
          )
          const header = this.toProjectedHeader(ticket)
          return {
            value: ticket,
            acknowledgement: {
              contentHash: projectedHeaderHash(header),
              header,
            },
          }
        },
      })
      return finish(ticket)
    }
    catch (error) {
      // MDT-200: preserve typed domain errors so callers can distinguish a
      // cloud fail-closed (BR-1.5) from a generic create failure. CoordinatorError
      // must surface verbatim — never swallowed into a local-fallback path.
      if (error instanceof CoordinatorError || error instanceof ServiceError || error instanceof TicketIdentityConflictError) {
        throw error
      }
      throw new Error(`Failed to create CR: ${(error as Error).message}`)
    }
  }

  private async createLocalTicketWithNumber(
    project: Project,
    crType: string,
    data: TicketData,
    ticketNumber: number,
    createdAt?: string,
    exclusive = false,
    creationId?: string,
    onBodySource?: (source: 'generated' | 'supplied') => void,
  ): Promise<Ticket> {
    const crKey = formatCrKey(project.project.code, ticketNumber)
    const location = await this.ticketLocationResolver.resolve(project, crKey)
    const crPath = path.resolve(location.projectRoot, location.ticketsPath)
    const titleSlug = data.slug ?? this.repository.slug(data.title)
    const filename = `${crKey}-${titleSlug}.md`
    const filePath = path.join(crPath, filename)

    if (exclusive) {
      const inventory = await this.readIdentityInventory(project)
      assertSafeTicketInventory(inventory)
      const occupied = inventory.files.filter(file => file.code === crKey)
      const physicalFilePath = path.join(await realpath(crPath), filename)
      const physicalRoot = await realpath(location.projectRoot)
      if (occupied.some(file => file.absolutePath !== physicalFilePath && file.root === physicalRoot) || occupied.some(file => !creationId || file.creationId !== creationId))
        throw new CoordinatorError('reservation_state_conflict', { message: 'Reserved key belongs to an existing canonical creation; resolve the conflict explicitly' })
    }
    await fs.ensureDir(crPath)
    const ticket = SharedCRService.createTicket(data, crKey, crType, filePath)
    if (creationId)
      Object.assign(ticket, { creationId })
    if (createdAt) {
      const stableCreatedAt = new Date(createdAt)
      ticket.dateCreated = stableCreatedAt
      ticket.lastModified = stableCreatedAt
    }
    await this.repository.create(ticket, data, exclusive, onBodySource)

    return {
      ...ticket,
      inWorktree: location.isWorktree,
      worktreePath: location.isWorktree ? location.projectRoot : undefined,
    }
  }

  private toProjectedHeader(ticket: Ticket): ProjectedHeader {
    return {
      ...(ticket.creationId ? { creationId: ticket.creationId } : {}),
      code: ticket.code,
      title: ticket.title,
      status: ticket.status,
      type: ticket.type || null,
      priority: ticket.priority || null,
      assignee: ticket.assignee || null,
      date_created: ticket.dateCreated?.toISOString() ?? null,
      last_modified:
        ticket.lastModified?.toISOString() ?? new Date().toISOString(),
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    // Allow same status (no-op updates)
    if (currentStatus === newStatus) {
      return
    }

    // Define valid status transitions using documented 7 statuses
    const validTransitions: Record<string, string[]> = {
      [CRStatusEnum.PROPOSED]: [
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.APPROVED]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.REJECTED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.IN_PROGRESS]: [
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.APPROVED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.IMPLEMENTED]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.REJECTED]: [
        CRStatusEnum.PROPOSED,
        CRStatusEnum.APPROVED,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.ON_HOLD,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.ON_HOLD]: [
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.PARTIALLY_IMPLEMENTED,
      ],
      [CRStatusEnum.PARTIALLY_IMPLEMENTED]: [
        CRStatusEnum.IMPLEMENTED,
        CRStatusEnum.IN_PROGRESS,
        CRStatusEnum.APPROVED,
        CRStatusEnum.REJECTED,
        CRStatusEnum.PROPOSED,
        CRStatusEnum.ON_HOLD,
      ],
    }

    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      const validOptions = allowedTransitions.join(', ')
      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Valid transitions from '${currentStatus}': ${validOptions}`,
      )
    }
  }

  /**
   * Delete a CR from a project
   */
  async deleteCR(project: Project, key: string): Promise<boolean> {
    try {
      const cr = await this.getCR(project, key)
      if (!cr) {
        return false
      }

      await this.repository.remove(cr.filePath)
      await this.syncTicketProjectionBestEffort(project, cr, cr, 'deleted')
      return true
    }
    catch (error) {
      if (error instanceof TicketIdentityConflictError)
        throw error
      return false
    }
  }

  /**
   * Read this installation's cloud connection from CONFIG_DIR
   * (`{CONFIG_DIR}/projects/{project.id}/cloud-sync.toml`) under the effective
   * trusted service profile. This is the single authority for local-vs-cloud
   * selection; the legacy `[project.cloudSync]` repo binding is no longer read.
   *
   * `absent` is the ONLY outcome that means local-only (BR-5.1). `enabled`
   * selects cloud; `disabled` / `malformed` / `untrusted` fail closed (BR-4.2).
   * CONFIG_DIR state never grants identity — the cloud re-verifies membership
   * per operation (BR-3.1, TASK-8).
   */
  private readIdentityInventory(project: Project) { return this.repository.inventory(project) }

  private canonicalCloudProject(project: Project): Project {
    const parsed = CanonicalProjectCodeSchema.safeParse(project.project.code)
    if (!parsed.success)
      throw new CoordinatorError('invalid_request', { message: 'Cloud creation requires a valid canonical project code' })
    return { ...project, project: { ...project.project, code: parsed.data } }
  }

  private async verifyCloudCreation(project: Project, ticketNumber: number, creationId: string): Promise<void> {
    const current = await this.readIdentityInventory(project)
    assertSafeTicketInventory(current)
    const matches = current.files.filter(file => file.code === formatCrKey(project.project.code, ticketNumber))
    if (!matches.length || matches.some(file => file.creationId !== creationId))
      throw new CoordinatorError('reservation_state_conflict', { message: 'Canonical file does not match its reserved creation identity' })
  }

  /** Owner inspection has no credential, network, ticket write or lock acquisition. */
  async inspectCreationRecovery(project: Project): Promise<CreationRecoveryInspection> {
    return await (await this.creationRecoveryService(project))?.inspect() ?? { entries: [] }
  }

  async resumeCreationRecovery(project: Project, input: CreationRecoveryResumeInput): Promise<CreationRecoveryOutcome> {
    const recovery = await this.creationRecoveryService(project, input.expectedDigest)
    if (!recovery)
      throw new CoordinatorError('reservation_state_conflict', { message: 'No cloud creation binding is available for recovery' })
    return recovery.resume(input)
  }

  async reconcileCreationRecovery(project: Project, input: CreationRecoveryReconcileInput): Promise<CreationRecoveryOutcome> {
    const recovery = await this.creationRecoveryService(project)
    if (!recovery)
      throw new CoordinatorError('reservation_state_conflict', { message: 'No cloud creation binding is available for recovery' })
    return recovery.reconcile(input)
  }

  private async creationRecoveryService(project: Project, expectedDigest?: string): Promise<CreationRecoveryService | null> {
    const connection = await this.resolveCloudConnection(project)
    if (connection.kind === 'absent')
      return null
    if (connection.kind !== 'enabled' && connection.kind !== 'disabled')
      throw new CoordinatorError('coordination_suspended', { message: 'Restore a trusted readable cloud binding before recovery' })
    // Route discovery does not scan ticket contents: an invalid file must not
    // prevent inspection of the retained creation intent that can diagnose it.
    const layout = await repositoryRoots(project.project.path)
    const journal = new CloudOperationJournal({
      rootDir: this.cloudRuntime.journalRoot ?? path.join(getDefaultPaths().CONFIG_DIR, 'cloud-sync', 'journals'),
      physicalRepoPath: layout.physicalRepoPath,
      legacyPhysicalRepoPaths: [project.project.path, ...layout.roots],
    })
    const binding = bindingFromEnabledConnection(connection.connection)
    const client = () => this.cloudRuntime.coordinatorFactory?.(binding) ?? new HttpCloudSyncCoordinator({ serviceUrl: binding.serviceUrl, globalConfig: buildEffectiveCloudSyncConfig(this.projectService.getGlobalConfig().cloudSync) })
    const credential = async () => {
      const value = await (this.cloudRuntime.credentialProvider ?? new RuntimeCloudCredentialProvider()).resolve(binding.serviceUrl)
      if (!value)
        throw new CoordinatorError('authentication_required')
      return value
    }
    return new CreationRecoveryService({
      journal,
      cloudProjectId: binding.projectId,
      resumeOperation: async (op) => {
        if (connection.kind !== 'enabled')
          throw new CoordinatorError('coordination_suspended', { message: 'A disabled connection cannot resume ticket creation' })
        const canonicalProject = this.canonicalCloudProject(project)
        const headerFor = async (operation: PendingOperation) => {
          const ticket = await this.getCR(canonicalProject, formatCrKey(canonicalProject.project.code, operation.ticketNumber!))
          if (!ticket || ticket.creationId !== operation.creationId)
            throw new CoordinatorError('reservation_state_conflict', { message: 'Recovery requires the original canonical creation' })
          return this.toProjectedHeader(ticket)
        }
        const runner = new RecoveryRunner({
          journal,
          expectedDigest,
          coordinator: client(),
          credential: await credential(),
          writeLocal: async (_projectId, reservation) => {
            if (!op.draft || !op.creationId)
              throw new CoordinatorError('reservation_state_conflict')
            await this.createLocalTicketWithNumber(canonicalProject, op.draft.crType, op.draft.data, reservation.ticketNumber, op.createdAt, true, op.creationId)
          },
          verifyLocal: async (_projectId, reservation) => {
            await this.verifyCloudCreation(canonicalProject, reservation.ticketNumber, op.creationId!)
            if (op.acknowledgement && projectedHeaderHash(await headerFor(op)) !== op.acknowledgement.contentHash)
              throw new CoordinatorError('reservation_state_conflict', { message: 'Canonical header changed since the retained acknowledgement; inspect and reconcile explicitly' })
          },
          buildAcknowledgement: async (operation) => {
            const header = await headerFor(operation)
            return { operationId: operation.operationId, header, contentHash: projectedHeaderHash(header) }
          },
        })
        return runner.recoverPending([binding.projectId])
      },
      verifyTerminal: async (op) => {
        const coordinator = client()
        if (!coordinator.getClaim || !op.reservationId || op.ticketNumber === undefined)
          return null
        const claim = await coordinator.getClaim({ cloudProjectId: binding.projectId, ticketNumber: op.ticketNumber }, await credential())
        if (claim.reservationId !== op.reservationId || claim.ticketNumber !== op.ticketNumber || (claim.creationId ?? undefined) !== op.creationId || (claim.state !== 'acknowledged' && claim.state !== 'abandoned'))
          return null
        let canonicalVerified = false
        if (claim.state === 'acknowledged' && op.creationId) {
          try {
            await this.verifyCloudCreation(this.canonicalCloudProject(project), op.ticketNumber, op.creationId)
            canonicalVerified = true
          }
          catch { return null }
        }
        return { cloudProjectId: binding.projectId, reservationId: op.reservationId, ticketNumber: op.ticketNumber, creationId: op.creationId, state: claim.state, canonicalVerified }
      },
    })
  }

  /** Read-only classification for the server watcher; never launches human login. */
  async observeTicketIdentities(project: Project): Promise<TicketIdentityDiagnostic[]> {
    try {
      const connection = await this.resolveCloudConnection(project)
      if (connection.kind === 'absent') {
        this.identityObservationProofs.delete(project.id)
        this.identityObservationOffsets.delete(project.id)
        return []
      }
      const inventory = await this.readIdentityInventory(project)
      const diagnostics = [...inventory.diagnostics]
      const conflicting = new Set<string>()
      for (const file of inventory.files) {
        try {
          assertUnambiguousTicket(inventory, file.code)
        }
        catch { conflicting.add(file.code) }
      }
      const credential = connection.kind === 'enabled'
        ? await (this.cloudRuntime.nonInteractiveCredentialProvider?.resolve(connection.connection.serviceOrigin)
          ?? new RuntimeCloudCredentialProvider().resolveNonInteractive(connection.connection.serviceOrigin))
        : null
      const coordinator = connection.kind === 'enabled'
        ? this.cloudRuntime.coordinatorFactory?.(bindingFromEnabledConnection(connection.connection)) ?? new HttpCloudSyncCoordinator({ serviceUrl: connection.connection.serviceOrigin, globalConfig: buildEffectiveCloudSyncConfig(this.projectService.getGlobalConfig().cloudSync) })
        : null
      // Credentials are hashed only to invalidate device-local evidence. This
      // cache grants no permission and is never consulted by a mutation.
      const context = createHash('sha256').update(JSON.stringify({ connection, credential })).digest('hex')
      let cache = this.identityObservationProofs.get(project.id)
      if (!cache || cache.context !== context) {
        cache = { context, entries: new Map() }
        this.identityObservationProofs.set(project.id, cache)
        this.identityObservationOffsets.delete(project.id)
      }
      const signature = (file: (typeof inventory.files)[number]) => JSON.stringify([file.code, file.creationId, file.contentHash, file.absolutePath, file.valid])
      const current = new Map(inventory.files.filter(file => file.valid && file.creationId && !conflicting.has(file.code)).map(file => [file.relativePath, signature(file)]))
      for (const [filePath, proof] of cache.entries) {
        if (!credential || current.get(filePath) !== proof.signature)
          cache.entries.delete(filePath)
      }
      const claims = new Map<string, TicketClaimResponse>()
      const eligible = [...new Set(inventory.files.filter(file => file.valid && file.creationId && !conflicting.has(file.code)).map(file => file.code))].sort()
      const offset = (this.identityObservationOffsets.get(project.id) ?? 0) % Math.max(eligible.length, 1)
      const selected = new Set([...eligible.slice(offset), ...eligible.slice(0, offset)].slice(0, 64))
      this.identityObservationOffsets.set(project.id, (offset + selected.size) % Math.max(eligible.length, 1))
      let authorizationLost = false
      for (const code of selected) {
        const file = inventory.files.find(file => file.code === code)!
        if (!credential || !coordinator?.getClaim || connection.kind !== 'enabled')
          break
        try {
          claims.set(code, await coordinator.getClaim({ cloudProjectId: connection.connection.cloudProjectId, ticketNumber: file.ticketNumber }, credential))
        }
        catch (error) {
          // Revocation invalidates every proof in this context, including
          // entries outside this wave. Do not continue probing after denial.
          if (error instanceof CoordinatorError && ['authentication_required', 'forbidden', 'not_found', 'project_not_found'].includes(error.code)) {
            cache.entries.clear()
            claims.clear()
            authorizationLost = true
            break
          }
        }
      }
      for (const file of inventory.files) {
        if (conflicting.has(file.code)) {
          diagnostics.push({ code: file.code, filePath: file.relativePath, state: 'conflict', message: 'Multiple local files claim this ticket key; inspect each path before changing it' })
          continue
        }
        const prior = cache.entries.get(file.relativePath)
        const claim = claims.get(file.code)
        if (!authorizationLost && !selected.has(file.code) && prior) {
          diagnostics.push({ ...prior.diagnostic })
          continue
        }
        const diagnostic: TicketIdentityDiagnostic = { ...classifyTicketIdentity(file, claim), stale: !claim }
        if (claim)
          diagnostic.lastVerifiedAt = new Date().toISOString()
        else if (!authorizationLost && prior?.diagnostic.lastVerifiedAt)
          diagnostic.lastVerifiedAt = prior.diagnostic.lastVerifiedAt
        if (!authorizationLost && current.has(file.relativePath))
          cache.entries.set(file.relativePath, { signature: signature(file), diagnostic })
        diagnostics.push(diagnostic)
      }
      return diagnostics
    }
    catch {
      this.identityObservationProofs.delete(project.id)
      return [{ code: project.project.code, filePath: '.', state: 'verification_pending', message: 'Ticket identity inventory could not be verified; explicit retry or operator review is required' }]
    }
  }

  private async resolveCloudConnection(
    project: Project,
  ): Promise<ProjectConnectionRead> {
    const globalConfig = this.projectService.getGlobalConfig()
    const profile = resolveTrustedServiceProfile({
      operatorOrigins: globalConfig.cloudSync.allowedOrigins,
    })
    const stateStore = new ProjectStateStore({
      rootDir: this.cloudRuntime.stateStoreRoot ?? getDefaultPaths().CONFIG_DIR,
      profile,
    })
    return stateStore.read(project.id)
  }

  private async syncTicketProjectionBestEffort(
    project: Project,
    previous: Ticket,
    next: Ticket,
    lifecycle: 'active' | 'deleted',
  ): Promise<void> {
    try {
      if (!previous.creationId || next.creationId !== previous.creationId)
        return // Legacy/unknown provenance requires explicit reconciliation before publication.
      const connection = await this.resolveCloudConnection(project)
      if (connection.kind !== 'enabled') {
        // absent (local-only) or disabled/malformed/untrusted (fail-closed):
        // no projection to publish. Local edits still succeed.
        return
      }
      const binding = bindingFromEnabledConnection(connection.connection)
      const ticketNumber = Number.parseInt(
        next.code.split('-').pop() ?? '',
        10,
      )
      if (!Number.isSafeInteger(ticketNumber))
        return

      const effectiveConfig = buildEffectiveCloudSyncConfig(
        this.projectService.getGlobalConfig().cloudSync,
      )
      const sync = new CloudProjectionSync({
        binding,
        allowedOrigins: effectiveConfig.allowedOrigins,
        journalRoot: path.join(
          this.cloudRuntime.journalRoot ?? getDefaultPaths().CONFIG_DIR,
          'cloud-sync',
          'projection-journal',
        ),
        physicalRepoPath: project.project.path,
        credentialProvider:
          this.cloudRuntime.credentialProvider
          ?? new RuntimeCloudCredentialProvider(),
        client: this.cloudRuntime.projectionClientFactory?.(binding),
      })
      await sync.publish(
        ticketNumber,
        this.toProjectedHeader(previous),
        this.toProjectedHeader(next),
        lifecycle,
      )
    }
    catch (error) {
      // Existing Markdown edits stay successful while cloud projection is
      // unavailable. The durable projection journal is retried by the poller.
      logQuiet(this.quiet, `Cloud projection queued for ${next.code}`, error)
    }
  }

  /**
   * Get the next CR number for a project
   * Uses file scanning only (counter file dependency removed per MDT-071)
   */
  async getNextCRNumber(project: Project): Promise<number> {
    try {
      // Get the correct CR directory path
      const crPath = await this.getCRPath(project)

      // Scan existing CR files to find the highest number
      const allFiles = await readdir(crPath)
      const crFiles = allFiles.filter(file => file.endsWith('.md'))
      let highestExistingNumber = 0

      for (const filename of crFiles) {
        const match = filename.match(
          new RegExp(`${project.project.code}-(\\d+)-`, 'i'),
        )
        if (match) {
          const number = Number.parseInt(match[1], 10)
          if (!Number.isNaN(number) && number > highestExistingNumber) {
            highestExistingNumber = number
          }
        }
      }

      // Use file scanning only (counter file dependency removed per MDT-071)
      const nextNumber = Math.max(
        highestExistingNumber + 1,
        project.project.startNumber || 1,
      )

      return nextNumber
    }
    catch {
      return project.project.startNumber || 1
    }
  }

  /**
   * Rename a ticket: update the H1 title and optionally the file slug.
   *
   * @param project - Project containing the ticket
   * @param key - Ticket key (e.g., MDT-143)
   * @param newTitle - New title string
   * @param newSlug - Optional explicit slug. If omitted, derived from newTitle.
   * @returns The updated ticket (with new filePath if renamed)
   */
  async renameTicket(
    project: Project,
    key: string,
    newTitle: string,
    newSlug?: string,
  ): Promise<Ticket> {
    const ticket = await this.getCR(project, key)
    if (!ticket) {
      throw ServiceError.ticketNotFound(key)
    }

    await this.repository.rename(ticket, key, newTitle, newSlug)

    // Re-read to return updated ticket
    const location = await this.ticketLocationResolver.resolve(project, key)
    const fullCRPath = path.resolve(location.projectRoot, location.ticketsPath)
    const tickets = await this.repository.scan(
      fullCRPath,
      location.projectRoot,
    )
    const updated = tickets.find(
      t => t.code.toUpperCase() === key.toUpperCase(),
    )
    if (!updated) {
      throw ServiceError.persistenceError(
        `Ticket ${key} disappeared after rename`,
      )
    }

    return {
      ...updated,
      inWorktree: location.isWorktree,
      worktreePath: location.isWorktree ? location.projectRoot : undefined,
    }
  }

  /**
   * Create URL-safe slug from title
   */
}
