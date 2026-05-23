export const ProjectSharingMode = {
  PRIVATE: 'private',
  UNLISTED_READONLY: 'unlisted-readonly',
  PUBLIC_READONLY: 'public-readonly',
} as const

export type ProjectSharingModeValue = typeof ProjectSharingMode[keyof typeof ProjectSharingMode]

export const ProjectSharingModes = [
  ProjectSharingMode.PRIVATE,
  ProjectSharingMode.UNLISTED_READONLY,
  ProjectSharingMode.PUBLIC_READONLY,
] as const

export interface ProjectSharingSettings {
  mode: ProjectSharingModeValue
  shareId?: string
  updatedAt?: string
}

export interface Project {
  id: string
  project: {
    id: string
    name: string
    code: string
    path: string
    configFile: string
    active: boolean
    description: string
    repository: string
    ticketsPath: string
  }
  metadata: {
    dateRegistered: string
    lastAccessed: string
    version: string
    globalOnly?: boolean
    sharing?: ProjectSharingSettings
  }
  document?: {
    paths?: string[]
    excludeFolders?: string[]
  }
  configPath?: string
  registryFile?: string
}

export interface ProjectConfig {
  name: string
  code: string
  crsPath?: string
  description?: string
  repositoryUrl?: string
}

export interface RegistryData {
  project: {
    path: string
    active?: boolean
    name?: string
    code?: string
    id?: string
    ticketsPath?: string
    description?: string
    repository?: string
    document?: {
      paths?: string[]
      excludeFolders?: string[]
    }
  }
  metadata: {
    dateRegistered?: string
    lastAccessed?: string
    version?: string
    globalOnly?: boolean
    sharing?: ProjectSharingSettings
  }
}
