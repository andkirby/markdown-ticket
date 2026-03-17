import type {
  CreateProjectInput,
  DocumentConfig,
  LocalProjectConfig,
  LocalProjectConfigProject,
  Project,
  ProjectDetails,
  UpdateProjectInput,
} from '../project/schema'

export function buildProjectDetails(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  const defaults: ProjectDetails = {
    code: 'MDT',
    name: 'Markdown Ticket',
    id: 'markdown-ticket',
    ticketsPath: 'docs/CRs',
    description: 'AI-powered Kanban board with markdown tickets',
    repository: 'https://github.com/example/markdown-ticket',
    active: true,
  }

  return { ...defaults, ...overrides }
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  const projectDetails = buildProjectDetails()
  const runtimeProject: Project = {
    id: projectDetails.id,
    project: {
      ...projectDetails,
      path: '/tmp/markdown-ticket',
      configFile: '/tmp/markdown-ticket/.mdt-config.toml',
      counterFile: '.mdt-next',
      startNumber: 1,
      description: projectDetails.description || '',
      repository: projectDetails.repository || '',
    },
    metadata: {
      dateRegistered: '2025-01-01',
      lastAccessed: '2025-01-01',
      version: '1.0.0',
    },
  }

  return {
    ...runtimeProject,
    ...overrides,
    project: {
      ...runtimeProject.project,
      ...(overrides.project || {}),
    },
    metadata: {
      ...runtimeProject.metadata,
      ...(overrides.metadata || {}),
    },
  }
}

export function buildProjectConfig(
  projectOverrides: Partial<LocalProjectConfigProject> = {},
  documentOverrides: Partial<DocumentConfig> = {},
): LocalProjectConfig {
  const projectDetails = buildProjectDetails({
    code: projectOverrides.code,
    name: projectOverrides.name,
    id: projectOverrides.id,
    ticketsPath: projectOverrides.ticketsPath,
    description: projectOverrides.description,
    repository: projectOverrides.repository,
    active: projectOverrides.active,
  })
  const defaultDocumentConfig: DocumentConfig = {
    paths: ['docs/**/*.md', 'README.md'],
    excludeFolders: ['node_modules', '.git', 'dist'],
    maxDepth: 3,
  }

  const projectConfig: LocalProjectConfigProject = {
    ...projectDetails,
    ...projectOverrides,
    document: { ...defaultDocumentConfig, ...documentOverrides },
  }

  return { project: projectConfig }
}

export function buildCreateProjectInput(overrides: Partial<CreateProjectInput> = {}): CreateProjectInput {
  const defaults: CreateProjectInput = {
    code: 'WEB',
    name: 'Web Application',
    id: 'web-app',
    ticketsPath: 'tickets',
    description: 'Main web application project',
    repository: 'https://github.com/example/web-app',
  }

  return { ...defaults, ...overrides }
}

export function buildUpdateProjectInput(overrides: Partial<UpdateProjectInput> = {}): UpdateProjectInput {
  const defaults: UpdateProjectInput = {
    name: 'Updated Project Name',
  }

  return { ...defaults, ...overrides }
}

export function buildMinimalProject(): Project {
  return buildProject({
    id: 'a',
    project: {
      id: 'a',
      code: 'A1',
      name: 'ABC',
      path: '/tmp/a',
      configFile: '/tmp/a/.mdt-config.toml',
      active: true,
      description: '',
      repository: '',
      ticketsPath: 't',
    },
  })
}

export function buildProjectWithComplexDocumentConfig(): LocalProjectConfig {
  return buildProjectConfig(
    {},
    {
      paths: ['docs/**/*.md', 'src/**/*.md', '*.md'],
      excludeFolders: ['node_modules', '.git', 'dist', 'build'],
      maxDepth: 5,
    },
  )
}

export const invalidFixtures = {
  project: {
    invalidCode: (() => {
      const baseProject = buildProject()
      return buildProject({ project: { ...baseProject.project, code: 'invalid' } })
    })(),
    emptyName: (() => {
      const baseProject = buildProject()
      return buildProject({ project: { ...baseProject.project, name: '' } })
    })(),
    emptyId: (() => {
      const baseProject = buildProject()
      return buildProject({ id: '', project: { ...baseProject.project, id: '' } })
    })(),
    emptyTicketsPath: (() => {
      const baseProject = buildProject()
      return buildProject({ project: { ...baseProject.project, ticketsPath: '' } })
    })(),
  },
  createInput: {
    invalidCode: buildCreateProjectInput({ code: 'x' }),
    shortName: buildCreateProjectInput({ name: 'A' }),
    emptyId: buildCreateProjectInput({ id: '' }),
  },
  updateInput: {
    emptyUpdate: {} as UpdateProjectInput,
    invalidCode: buildUpdateProjectInput({ code: 'invalid' }),
    shortName: buildUpdateProjectInput({ name: 'A' }),
  },
  documentConfig: {
    parentReference: { paths: ['../../secret'] },
    absolutePath: { paths: ['/etc/passwd'] },
    pathInExcludeFolders: { excludeFolders: ['path/with/slash'] },
    maxDepthInvalid: { maxDepth: 0 },
  },
}

export function buildProjects(count: number, baseCode = 'PRJ'): Project[] {
  return Array.from({ length: count }, (_, i) => {
    const code = `${baseCode}${(i + 1).toString().padStart(2, '0')}`
    const id = `${baseCode.toLowerCase()}-${i + 1}`
    const baseProject = buildProject()
    return buildProject({
      id,
      project: {
        ...baseProject.project,
        code,
        id,
        name: `Project ${i + 1}`,
      },
    })
  })
}
