import type { Project } from '../../models/Project.js'
import type { ProjectConfigLookup, ResolvedTicketLocation } from './types.js'
import { join } from 'node:path'
import { DEFAULTS } from '../../utils/constants.js'
import { ProjectService } from '../ProjectService.js'
import { WorktreeService } from '../WorktreeService.js'

export class TicketLocationResolver {
  private readonly projectConfigLookup: ProjectConfigLookup
  private readonly worktreeService: WorktreeService

  constructor(
    projectConfigLookup: ProjectConfigLookup = new ProjectService(false),
    worktreeService: WorktreeService = new WorktreeService(),
  ) {
    this.projectConfigLookup = projectConfigLookup
    this.worktreeService = worktreeService
  }

  async resolve(project: Project, ticketCode: string): Promise<ResolvedTicketLocation> {
    const config = this.projectConfigLookup.getProjectConfig(project.project.path)
    const ticketsPath = config?.project?.ticketsPath ?? project.project.ticketsPath ?? DEFAULTS.TICKETS_PATH
    const projectCode = config?.project?.code ?? project.project.code
    const worktreeEnabled = config?.worktree?.enabled !== false

    const projectRoot = worktreeEnabled && projectCode
      ? await this.worktreeService.resolvePath(
          project.project.path,
          ticketCode,
          ticketsPath,
          projectCode,
        )
      : project.project.path

    return {
      projectRoot,
      ticketDir: join(projectRoot, ticketsPath, ticketCode),
      ticketsPath,
      isWorktree: projectRoot !== project.project.path,
      allowSymlinks: config?.project?.allowSymlinks === true,
    }
  }
}
