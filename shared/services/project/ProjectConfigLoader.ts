import type { ProjectConfig } from '../../models/Project.js'
import { ProjectConfigService } from './ProjectConfigService.js'

/** Discovery compatibility facade. Its distinct migration contract has the shared owner. */
export class ProjectConfigLoader {
  private readonly owner: ProjectConfigService
  constructor(quiet = false) { this.owner = new ProjectConfigService(quiet) }
  getProjectConfig(projectPath: string): ProjectConfig | null {
    return this.owner.getDiscoveryProjectConfig(projectPath)
  }
}
