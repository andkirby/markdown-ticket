import type { CreateProjectInput } from '@mdt/domain-contracts'

type BaseProjectConfig = Pick<CreateProjectInput, 'name' | 'code' | 'description' | 'repository' | 'ticketsPath'>

export type ProjectConfig = Partial<BaseProjectConfig> & {
  documentPaths?: string[]
  excludeFolders?: string[]
  worktreeEnabled?: boolean
}

export interface ProjectData {
  key: string
  path: string
  config: ProjectConfig
}
