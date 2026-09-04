/**
 * Project registration → lazy watcher lifecycle integration.
 *
 * MDT-183 lazy lifecycle + UAT 2026-09-02 (BR-7): production wiring shared by
 * the dev/prod entry (server.ts) and the e2e/test app factory, so tests
 * exercise the real registration path instead of test-injected watchers.
 *
 * Boot: register discovered project metadata with WatcherLifecycleManager
 * (no watchers created — watchers start lazily on first SSE subscriber).
 * Runtime: the global registry watcher feeds registry-change events back
 * into the lifecycle (D5) — a project registered while the server runs
 * becomes watchable without a restart.
 */

import type { ProjectConfig } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import type { ProjectRegistration } from './WatcherLifecycleManager.js'
import * as path from 'node:path'
import { getTicketsPath } from '@mdt/shared/models/Project.js'
import { DEFAULTS } from '@mdt/shared/utils/constants.js'
import { logger } from '@mdt/shared/utils/server-logger.js'

/** Discovery surface the integration needs (satisfied by SharedProjectService). */
export interface ProjectDiscoverySource {
  getAllProjects: (bypassCache?: boolean) => Promise<Project[]>
  getProjectConfig: (projectPath: string) => ProjectConfig | null
}

/** Structural shape of a discovered project as returned by discovery. */
export interface DiscoverableProject {
  id: string
  project: {
    name: string
    path: string
    active: boolean
  }
  autoDiscovered?: boolean
  configPath?: string
}

/** Watcher facade surface the integration needs. */
export interface WatcherRegistrationTarget {
  registerProject: (project: ProjectRegistration) => void
  resubscribeWriteClientsToProject: (projectId: string) => void
  initGlobalRegistryWatcher: () => void
  on: (event: string, listener: (event: unknown) => void) => unknown
}

/**
 * Resolve one discovered project into a lazy-lifecycle registration
 * (ticket glob + document paths + worktree root). Returns null when the
 * project is inactive, has no config, or its tickets dir does not exist yet
 * (transient during project creation — callers may retry).
 */
export async function buildProjectRegistration(
  discovery: ProjectDiscoverySource,
  serverProject: DiscoverableProject,
): Promise<ProjectRegistration | null> {
  if (!serverProject.project.active) {
    logger.info(`Skipping inactive project: ${serverProject.project.name}`)
    return null
  }

  let configPath: string

  if (serverProject.autoDiscovered && serverProject.configPath) {
    configPath = path.dirname(serverProject.configPath)
  }
  else {
    configPath = serverProject.project.path
  }

  const config = discovery.getProjectConfig(configPath)

  if (!config?.project) {
    logger.warn(`No config found for project: ${serverProject.project.name}`)
    return null
  }

  const crPath: string = getTicketsPath(config, DEFAULTS.TICKETS_PATH)
  const fullCRPath: string = path.resolve(configPath, crPath)
  const watchPath: string = path.join(fullCRPath, '*.md')
  const documentPaths = config.project.document?.paths || []

  // Check if directory exists
  try {
    const fs = await import('node:fs/promises')

    await fs.access(fullCRPath)
  }
  catch {
    logger.warn(`⚠️  CR directory not found for project ${serverProject.project.name}: ${fullCRPath}`)
    return null
  }

  return {
    id: serverProject.id,
    path: watchPath,
    projectRoot: configPath,
    projectCode: config.project?.code || serverProject.id.toUpperCase(), // MDT-142: Use project code for worktree detection
    documentPaths,
    ticketsPath: crPath,
  }
}

/** Retry delays: the registry .toml can appear before the tickets dir does. */
const RUNTIME_REGISTRATION_RETRY_DELAYS_MS = [400, 1000, 2000, 4000, 8000]

async function tryRegisterRuntimeProject(
  fileWatcher: WatcherRegistrationTarget,
  discovery: ProjectDiscoverySource,
  projectId: string,
): Promise<boolean> {
  const projects = await discovery.getAllProjects(true)
  const added = projects.find(p => p.id === projectId) as DiscoverableProject | undefined
  if (!added)
    return true // gone or rejected by discovery — stop retrying

  const registration = await buildProjectRegistration(discovery, added)
  if (!registration)
    return false // transient (e.g. tickets dir not created yet) — retry

  fileWatcher.registerProject(registration)
  fileWatcher.resubscribeWriteClientsToProject(registration.id)
  logger.info(`📥 Registered runtime-added project ${registration.id}: ${registration.path}`)
  return true
}

async function registerRuntimeProject(
  fileWatcher: WatcherRegistrationTarget,
  discovery: ProjectDiscoverySource,
  projectId: string,
): Promise<void> {
  for (let attempt = 0; attempt <= RUNTIME_REGISTRATION_RETRY_DELAYS_MS.length; attempt++) {
    try {
      if (await tryRegisterRuntimeProject(fileWatcher, discovery, projectId))
        return
    }
    catch (error) {
      console.error(`Error registering runtime-added project ${projectId}:`, error)
    }

    if (attempt < RUNTIME_REGISTRATION_RETRY_DELAYS_MS.length) {
      await new Promise(resolve => setTimeout(resolve, RUNTIME_REGISTRATION_RETRY_DELAYS_MS[attempt]))
    }
  }
  logger.warn(`⚠️  Runtime-added project ${projectId} not registered after ${RUNTIME_REGISTRATION_RETRY_DELAYS_MS.length + 1} attempts (will retry on next registry change)`)
}

/**
 * Production watcher registration wiring: boot-time metadata registration +
 * global registry watcher + runtime (registry-change) registration.
 */
export async function initializeProjectWatcherIntegration(
  fileWatcher: WatcherRegistrationTarget,
  discovery: ProjectDiscoverySource,
): Promise<void> {
  logger.info('🔍 Discovering projects for file watching...')

  try {
    const projects = await discovery.getAllProjects()
    let registered = 0

    for (const project of projects) {
      try {
        const registration = await buildProjectRegistration(discovery, project as DiscoverableProject)
        if (registration) {
          fileWatcher.registerProject(registration)
          registered++
          logger.info(`✅ Registered project ${registration.id}: ${registration.path}`)
        }
      }
      catch (error) {
        console.error(`Error setting up watcher registration for project ${project.id}:`, error)
      }
    }

    logger.info(`📡 ${registered} project(s) registered for lazy watcher lifecycle`)
  }
  catch (error) {
    console.error('Error initializing project watcher registration:', error)
    logger.warn('⚠️  Failed to register projects for file watching')
  }

  // Global registry watcher for project lifecycle events. Failure here must
  // degrade (no runtime registration) rather than reject the fire-and-forget
  // caller (the e2e app factory does not await this function).
  try {
    fileWatcher.initGlobalRegistryWatcher()
  }
  catch (error) {
    console.error('Error initializing global registry watcher:', error)
    return
  }

  // BR-7: runtime project additions feed the lazy watcher lifecycle.
  // 'project-updated' re-runs registration (idempotent) as a late re-trigger.
  fileWatcher.on('registry-change', (event: unknown) => {
    const typed = event as { type?: string, data?: { projectId?: string } }
    const eventType = typed?.type
    if ((eventType === 'project-created' || eventType === 'project-updated') && typed.data?.projectId) {
      void registerRuntimeProject(fileWatcher, discovery, typed.data.projectId)
    }
  })
}
