export interface Project {
  name: string
  code: string
  path: string
  active: boolean
}

export interface ProjectConfig {
  name: string
  code: string
  crsPath?: string
  description?: string
  repositoryUrl?: string
}
