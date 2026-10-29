import type { ProjectService } from '@mdt/shared/services/ProjectService.js'
import type { RuntimeConfig } from '../config/runtimeConfig.js'
import type FileWatcherService from '../services/fileWatcher/index.js'

export interface RuntimeOptions {
  runtimeConfig: RuntimeConfig
  projectDiscovery?: ProjectService
  fileWatcher?: FileWatcherService
  watcherIntegration?: boolean
}
export interface RuntimeHandle {
  start: () => Promise<void>
  stop: () => Promise<void>
  readonly state: 'constructed' | 'starting' | 'started' | 'stopped'
}
