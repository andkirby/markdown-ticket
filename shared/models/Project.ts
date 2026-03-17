import { ProjectConfigSchema } from '@mdt/domain-contracts'
import type { ProjectConfig } from '@mdt/domain-contracts'

export type {
  CreateProjectInput,
  DocumentConfig,
  LocalProjectConfig,
  LocalProjectConfigProject,
  Project,
  ProjectConfig,
  ProjectConfigProject,
  ProjectDetails,
  ProjectDocumentSettings,
  ProjectMetadata,
  ProjectRegistryEntry,
  ProjectRegistryProject,
  ProjectRuntimeFields,
  RegistryData,
  TicketsPath,
  UpdateProjectInput,
} from '@mdt/domain-contracts'

type LegacyProjectConfig = ProjectConfig & {
  document_paths?: string[]
  exclude_folders?: string[]
}

export function getTicketsPath(config: ProjectConfig | null, defaultPath = 'docs/CRs'): string {
  if (!config) {
    return defaultPath
  }

  if (config.project?.ticketsPath) {
    return config.project.ticketsPath
  }

  if (config.project?.path) {
    return config.project.path
  }

  return defaultPath
}

export function isLegacyConfig(config: ProjectConfig | null): boolean {
  if (!config || !config.project?.path) {
    return false
  }

  return !config.project.ticketsPath && !!config.project.path
}

export function migrateLegacyConfig(config: ProjectConfig): ProjectConfig {
  if (!isLegacyConfig(config)) {
    return config
  }

  const legacyTicketsPath = config.project.path!

  return {
    ...config,
    project: {
      ...config.project,
      path: '.',
      ticketsPath: legacyTicketsPath,
      document: config.project?.document || {
        paths: Array.isArray((config as LegacyProjectConfig).document_paths) ? (config as LegacyProjectConfig).document_paths : [],
        excludeFolders: Array.isArray((config as LegacyProjectConfig).exclude_folders) ? (config as LegacyProjectConfig).exclude_folders : [],
      },
    },
  }
}

export function validateProjectConfig(config: unknown): config is ProjectConfig {
  return ProjectConfigSchema.safeParse(config).success
}
