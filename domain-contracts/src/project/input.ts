import {
  CreateProjectInputSchema,
  DocumentConfigSchema,
  LocalProjectConfigProjectSchema,
  LocalProjectConfigSchema,
  ProjectConfigSchema,
  ProjectDetailsSchema,
  ProjectDocumentSettingsSchema,
  ProjectSharingMode,
  ProjectSharingModes,
  ProjectSharingModeSchema,
  ProjectSharingSettingsSchema,
  TicketsPathSchema,
  UpdateProjectInputSchema,
} from './schema'

// MCP references deliberately allow numeric-leading codes (unlike persisted IDs)
// and preserve spelling until the existing project validator normalizes it.
export { ProjectReferenceInputSchema } from './reference-input'

export {
  CreateProjectInputSchema,
  DocumentConfigSchema,
  LocalProjectConfigProjectSchema,
  LocalProjectConfigSchema,
  ProjectConfigSchema,
  ProjectDetailsSchema,
  ProjectDocumentSettingsSchema,
  ProjectSharingMode,
  ProjectSharingModes,
  ProjectSharingModeSchema,
  ProjectSharingSettingsSchema,
  TicketsPathSchema,
  UpdateProjectInputSchema,
}

export type {
  CreateProjectInput,
  DocumentConfig,
  LocalProjectConfig,
  LocalProjectConfigProject,
  ProjectConfig,
  ProjectConfigProject,
  ProjectDetails,
  ProjectDocumentSettings,
  ProjectEditFormData,
  ProjectSharingModeValue,
  ProjectSharingSettings,
  TicketsPath,
  UpdateProjectInput,
} from './schema'
