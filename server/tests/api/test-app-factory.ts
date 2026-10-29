import type { Router } from 'express'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { createApplication } from '../../app.js'
import { buildRuntimeConfig } from '../../config/runtimeConfig.js'

export interface CreateTestAppOptions {
  preAuthRouter?: Router
  watcherIntegration?: boolean
}

/** Test launcher only: the HTTP graph and runtime are the production builder. */
export function createTestApp(options: CreateTestAppOptions = {}) {
  const projectDiscovery = new ProjectService(true)
  projectDiscovery.setCacheTTL(0)
  return createApplication({
    ...options,
    runtimeConfig: buildRuntimeConfig(),
    projectDiscovery,
    watcherIntegration: options.watcherIntegration ?? false,
  })
}
