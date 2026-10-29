/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { RuntimeOptions } from './types.js'
import * as path from 'node:path'
import {
  AccessCredentialBroker,
  streamAuthorizationFromCredential,
} from '@mdt/shared/services/cloud-sync/access-credential-broker.js'

import { bindingFromEnabledConnection } from '@mdt/shared/services/cloud-sync/allocator-strategy.js'
import { CloudProjectionReadModel } from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import { CloudProjectionSessionClient } from '@mdt/shared/services/cloud-sync/CloudProjectionSessionClient.js'
import { CloudProjectionStreamClient } from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import { buildEffectiveCloudSyncConfig } from '@mdt/shared/services/cloud-sync/config.js'
import { RuntimeCloudCredentialProvider } from '@mdt/shared/services/cloud-sync/credential-providers.js'
import { ProjectStateStore } from '@mdt/shared/services/cloud-sync/project-state-store.js'
import { CloudProjectionSync } from '@mdt/shared/services/cloud-sync/projection-sync.js'
import { resolveTrustedServiceProfile } from '@mdt/shared/services/cloud-sync/trusted-service-profile.js'
// Services
import { ProjectService as SharedProjectService } from '@mdt/shared/services/ProjectService.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { ProjectionStreamManager } from '../services/cloud-sync/ProjectionStreamManager.js'
import { TicketIdentityObservation } from '../services/cloud-sync/TicketIdentityObservation.js'
import { DocumentService } from '../services/DocumentService.js'
import FileWatcherService from '../services/fileWatcher/index.js'
import { initializeProjectWatcherIntegration } from '../services/fileWatcher/projectRegistrationIntegration.js'
import { PinStateService } from '../services/PinStateService.js'
import { TicketService } from '../services/TicketService.js'

import { TreeService } from '../services/TreeService.js'

interface FileInvokerAdapter {
  readFile: (filePath: string) => Promise<string>
  clearCache: () => void
  invalidateFile: (filePath: string) => void
}

export function createRuntime(options: RuntimeOptions) {
  let registration: (() => Promise<void>) | undefined
  let disposed = false
  // Core services
  const fileWatcher = options.fileWatcher ?? new FileWatcherService()
  const projectDiscovery = options.projectDiscovery ?? new SharedProjectService()
  const cloudConfigDir = options.runtimeConfig.configDir
  /**
   * Process-scoped credential broker. A successful FOREGROUND resolution (an
   * explicit cloud operation such as a journaled ticket edit) makes a human
   * Access token available to the process — the documented owner action that
   * re-arms `authentication_required` stream pauses. Background
   * (non-interactive) resolution never spawns `cloudflared` (C-13, Edge-7).
   */
  // Late-bound stream re-arm listeners: the manager is constructed after the
  // broker but resolves its credentials through it.
  const credentialResolvedListeners: Array<(serviceOrigin: string) => void> = []
  const cloudCredentialProvider = new (class extends AccessCredentialBroker {
    override async resolve(serviceUrl: string) {
      const credential = await super.resolve(serviceUrl)
      if (credential) {
        for (const notify of credentialResolvedListeners)
          notify(serviceUrl)
      }
      return credential
    }
  })({
    provider: new RuntimeCloudCredentialProvider(),
  })

  // Business logic services
  const ticketService = new TicketService(projectDiscovery, {
    credentialProvider: cloudCredentialProvider,
    nonInteractiveCredentialProvider: { resolve: (origin: string) => cloudCredentialProvider.resolveNonInteractive(origin) },
  })

  // Watcher observations are separate from cloud projection mutation and never login.
  const ticketIdentityObservation = new TicketIdentityObservation({
    observe: projectId => ticketService.observeTicketIdentities(projectId),
    onChange: projectId => fileWatcher.broadcastTicketIdentityChange(projectId),
  })
  // =============================================================================
  // MDT-226: Cloud projection stream — one backend-owned WebSocket per enabled
  // cloud project. The browser never opens a cloud socket; it consumes the
  // unified ticket API and ordinary SSE events.
  // =============================================================================

  /** Reverse map: cloudProjectId → localProjectId (for SSE fan-out lookup). */
  const cloudToLocalProject = new Map<string, string>()
  /** Persistent projection-write-journal instances (one per enabled project). */
  const projectionSyncs: CloudProjectionSync[] = []

  /**
   * MDT-226 incident recovery: automatic projection streams stay behind a
   * per-installation rollout flag until the deployed grant/handshake and
   * 30-minute zero-idle-D1 gates pass (TEST-deployed-stream-handshake,
   * TEST-idle-zero-d1). Default OFF.
   */
  const projectionStreamRolloutEnabled = options.runtimeConfig.cloud.projectionStreamRolloutEnabled

  const projectionStreamManager = new ProjectionStreamManager({
    clientFactory: opts => new CloudProjectionStreamClient(opts),
    readModelFactory: (localProjectId, rootDir) =>
      new CloudProjectionReadModel({ localProjectId, rootDir: rootDir ?? cloudConfigDir }),
    sessionClientFactory: ({ serviceOrigin, cloudProjectId }) =>
      new CloudProjectionSessionClient({
        serviceUrl: serviceOrigin,
        // Effective trust = distribution origins + operator extensions (the
        // raw operator list alone would reject the distribution origin).
        globalConfig: buildEffectiveCloudSyncConfig({
          allowedOrigins: projectDiscovery.getGlobalConfig().cloudSync?.allowedOrigins ?? [],
        }),
      }, cloudProjectId),
    // Non-interactive only: a cached human token or a service credential; the
    // background path never launches an interactive login (C-13, Edge-7).
    credentialResolver: async (serviceOrigin) => {
      const cred = await cloudCredentialProvider.resolveNonInteractive(serviceOrigin)
      return cred ? streamAuthorizationFromCredential(cred) : null
    },
    onChange: (cloudProjectId) => {
      const localProjectId = cloudToLocalProject.get(cloudProjectId)
      if (!localProjectId)
        return
      // Fan out as an ordinary file-change so browsers refetch unified tickets.
      fileWatcher.broadcastProjectionChange(localProjectId)
    },
  })

  // A foreground credential resolution is the documented owner action that
  // re-arms authentication-paused and transport-exhausted streams.
  credentialResolvedListeners.push((serviceOrigin) => {
    projectionStreamManager.notifyCredentialResolved(serviceOrigin)
      .catch((err: unknown) => logger.warn(`[MDT-226] credential re-arm failed: ${err instanceof Error ? err.message : String(err)}`))
  })

  // Wire the read-model provider so /tickets/unified merges cloud projections
  // with canonical local tickets (local wins on duplicate code, BR-1.9).
  ticketService.setProjectionReadModelProvider((localProjectId: string) => {
    const rm = projectionStreamManager.getReadModel(localProjectId)
    if (!rm)
      return undefined
    return {
      entries: (localCodes: Set<string>) => rm.unifiedView(localCodes),
      stale: rm.stale,
    }
  })

  /**
   * Type cast for compatibility.
   */

  const documentService = new DocumentService(projectDiscovery)
  const treeService = new TreeService(projectDiscovery)
  const pinStateService = new PinStateService(projectDiscovery)

  // Connect file watcher to document service for cache invalidation
  fileWatcher.setFileInvoker(documentService.fileInvoker as FileInvokerAdapter)

  async function initializeMultiProjectWatchers(): Promise<void> {
  // MDT-183 (+ UAT 2026-09-02, BR-7): boot metadata registration + registry
  // watcher + runtime registration wiring live in the shared integration so
  // the e2e/test app factory exercises the identical production path.
    registration = await initializeProjectWatcherIntegration(fileWatcher, projectDiscovery)
    if (disposed)
      await registration()
  }

  /**
   * MDT-226: Start one projection stream per enabled cloud-sync project. Mirrors
   * the per-project connection resolution used by the poll path (resolveTrusted
   * profile → ProjectStateStore.read → filter enabled). Each stream is a backend-
   * owned WebSocket; the browser never opens one.
   */
  async function startProjectionStreams(): Promise<void> {
    try {
    // Rollout gate: automatic streams remain disabled until the deployed
    // handshake and idle-D1 gates pass (MDT-226 incident recovery).
      if (disposed)
        return
      if (!projectionStreamRolloutEnabled) {
        logger.info('[MDT-226] Projection stream rollout flag is OFF — automatic streams disabled (set MDT_PROJECTION_STREAM_ROLLOUT=true only after the deployed gates pass)')
        return
      }

      const projects = await projectDiscovery.getAllProjects()
      if (disposed)
        return
      const globalConfig = projectDiscovery.getGlobalConfig()
      const profile = resolveTrustedServiceProfile({
        operatorOrigins: globalConfig.cloudSync?.allowedOrigins ?? [],
      })
      const stateStore = new ProjectStateStore({ rootDir: cloudConfigDir, profile })

      for (const project of projects) {
        if (disposed)
          return
        try {
          const connection = await stateStore.read(project.id)
          if (disposed)
            return
          if (connection.kind !== 'enabled')
            continue

          const { cloudProjectId, serviceOrigin } = connection.connection
          cloudToLocalProject.set(cloudProjectId, project.id)

          // Register the read model and reconnect owner even when authentication
          // is currently unavailable. Background attempts never launch login;
          // they reuse a cached human token or resolve a service credential.
          await projectionStreamManager.start({
            localProjectId: project.id,
            cloudProjectId,
            serviceOrigin,
            rootDir: cloudConfigDir,
          })
          if (disposed) {
            // stopAll may have run while this acquisition was awaiting activation.
            projectionStreamManager.stop(project.id)
            await projectionStreamManager.whenIdle()
            return
          }
          logger.info(`[MDT-226] Projection stream manager started for ${project.id} → ${cloudProjectId} (state: ${projectionStreamManager.getStatus(project.id)?.state ?? 'unknown'})`)

          // Start the bounded write-journal retry runner so stuck entries
          // (authentication_paused, transient) are retried on a fixed interval
          // instead of waiting forever (C-12).
          const binding = bindingFromEnabledConnection(connection.connection)
          const sync = new CloudProjectionSync({
            binding,
            // Effective trust = distribution origins + operator extensions. The
            // raw operator list alone fail-closes the journal's publishes before
            // the wire (found on the deployed 2026-08-15 probe).
            allowedOrigins: buildEffectiveCloudSyncConfig({
              allowedOrigins: globalConfig.cloudSync?.allowedOrigins ?? [],
            }).allowedOrigins,
            journalRoot: path.join(cloudConfigDir, 'cloud-sync', 'projection-journal'),
            physicalRepoPath: project.project.path,
            credentialProvider: cloudCredentialProvider,
          })
          sync.startRetryRunner(60_000)
          projectionSyncs.push(sync)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.warn(`[MDT-226] Failed to start projection stream for ${project.id}: ${message}`)
        }
      }
      logger.info(`[MDT-226] ${projectionStreamManager.openStreamCount} projection stream(s) active`)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`[MDT-226] Projection stream initialization failed: ${message}`)
    }
  }

  let state: 'constructed' | 'starting' | 'started' | 'stopped' = 'constructed'
  let starting: Promise<void> | undefined
  let stopping: Promise<void> | undefined
  const listeners: Array<[string, (...args: any[]) => void]> = []
  function listen(event: string, listener: (...args: any[]) => void) {
    fileWatcher.on(event, listener)
    listeners.push([event, listener])
  }
  async function dispose(): Promise<void> {
    if (disposed)
      return
    disposed = true
    for (const [event, listener] of listeners)
      fileWatcher.off(event, listener)
    listeners.length = 0
    const registrations = registration?.()
    const observation = ticketIdentityObservation.stop()
    projectionStreamManager.stopAll()
    const streams = projectionStreamManager.whenIdle()
    const retries = projectionSyncs.map(sync => sync.stopRetryRunner())
    projectionSyncs.length = 0
    credentialResolvedListeners.length = 0
    cloudToLocalProject.clear()
    const watchers = fileWatcher.stop()
    await Promise.all([registrations, observation, streams, watchers, ...retries])
  }
  async function start(): Promise<void> {
    if (state === 'stopped')
      throw new Error('Runtime has been stopped; construct a new runtime to start again')
    if (starting)
      return starting
    state = 'starting'
    starting = (async () => {
      listen('file-change', (data: { projectId: string, subdocument?: unknown }) => {
        if (!data.subdocument)
          ticketIdentityObservation.schedule(data.projectId)
      })
      listen('ready', (data: { projectId: string }) => ticketIdentityObservation.schedule(data.projectId))
      listen('worktree-ready', (data: { projectId: string }) => ticketIdentityObservation.schedule(data.projectId))
      listen('error', (data: { projectId?: string }) => {
        if (data.projectId)
          ticketIdentityObservation.schedule(data.projectId)
      })

      try {
        if (options.watcherIntegration !== false)
          await initializeMultiProjectWatchers()
        if (disposed)
          return
        const projects = await projectDiscovery.getAllProjects()
        if (disposed)
          return
        await Promise.all(projects.map(project => ticketIdentityObservation.refresh(project.id)))
        if (disposed)
          return
        fileWatcher.startHeartbeat()
        await startProjectionStreams()
        if (!disposed)
          state = 'started'
      }
      catch (error) {
        state = 'stopped'
        await dispose()
        throw error
      }
    })()
    return starting
  }
  function stop(): Promise<void> {
    if (stopping)
      return stopping
    const pending = starting
    state = 'stopped'
    const resources = dispose()
    stopping = (async () => {
      await Promise.all([pending?.catch(() => {}), resources])
      state = 'stopped'
    })()
    return stopping
  }
  return {
    fileWatcher,
    projectDiscovery,
    ticketService,
    documentService,
    treeService,
    pinStateService,
    ticketIdentityObservation,
    projectionStreamManager,
    projectionStreamRolloutEnabled,
    start,
    stop,
    get state() { return state },
  }
}
