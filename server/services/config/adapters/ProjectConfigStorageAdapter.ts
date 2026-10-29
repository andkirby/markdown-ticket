import type { ProjectConfigDisplayFile } from '@mdt/domain-contracts'
import type { ConfigStorageAdapter, ScopeWriteResult } from '../types.js'
import { ProjectConfigService } from '@mdt/shared/services/project/ProjectConfigService.js'

/** HTTP scope adapter. Project-file read/modify/write policy has one shared owner. */
export class ProjectConfigStorageAdapter implements ConfigStorageAdapter<ProjectConfigDisplayFile> {
  readonly scope = 'project' as const
  constructor(private readonly projectPath: string, private readonly owner = new ProjectConfigService(true)) {}
  get filePath(): string { return this.owner.projectFilePath(this.projectPath) }
  read(forWrite = false): Promise<ProjectConfigDisplayFile> { return this.owner.readProjectFile(this.projectPath, forWrite) }
  write(mutator: (current: ProjectConfigDisplayFile) => ProjectConfigDisplayFile): Promise<ScopeWriteResult> {
    return this.owner.mutateProjectFile(this.projectPath, mutator)
  }
}
