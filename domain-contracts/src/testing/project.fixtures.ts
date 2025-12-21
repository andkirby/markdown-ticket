/**
 * MDT-101 Phase 1: Project Test Fixtures
 * Test builders for Project entities with field-level validation
 */

import type {
  Project,
  ProjectConfig,
  DocumentConfig,
  CreateProjectInput,
  UpdateProjectInput,
} from '../project/schema';

/**
 * Creates a valid Project with optional overrides
 * @param overrides - Partial project data to override defaults
 * @returns Valid Project object
 */
export function buildProject(overrides: Partial<Project> = {}): Project {
  const defaults: Project = {
    code: 'MDT',
    name: 'Markdown Ticket',
    id: 'markdown-ticket',
    ticketsPath: 'docs/CRs',
    description: 'AI-powered Kanban board with markdown tickets',
    repository: 'https://github.com/example/markdown-ticket',
    active: true,
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a ProjectConfig with DocumentConfig
 * @param projectOverrides - Optional overrides for project section
 * @param documentOverrides - Optional overrides for document config
 * @returns Valid ProjectConfig object
 */
export function buildProjectConfig(
  projectOverrides: Partial<Project> = {},
  documentOverrides: Partial<DocumentConfig> = {}
): ProjectConfig {
  const project = buildProject(projectOverrides);

  const defaultDocumentConfig: DocumentConfig = {
    paths: ['docs/**/*.md', 'README.md'],
    excludeFolders: ['node_modules', '.git', 'dist'],
    maxDepth: 3,
  };

  return {
    project,
    'project.document': { ...defaultDocumentConfig, ...documentOverrides },
  };
}

/**
 * Creates valid CreateProjectInput
 * @param overrides - Partial input data to override defaults
 * @returns Valid CreateProjectInput object
 */
export function buildCreateProjectInput(overrides: Partial<CreateProjectInput> = {}): CreateProjectInput {
  const defaults: CreateProjectInput = {
    code: 'WEB',
    name: 'Web Application',
    id: 'web-app',
    ticketsPath: 'tickets',
    description: 'Main web application project',
    repository: 'https://github.com/example/web-app',
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates valid UpdateProjectInput
 * @param overrides - Partial update data (at least one field required)
 * @returns Valid UpdateProjectInput object
 */
export function buildUpdateProjectInput(overrides: Partial<UpdateProjectInput> = {}): UpdateProjectInput {
  // Default to updating name to ensure at least one field is present
  const defaults: UpdateProjectInput = {
    name: 'Updated Project Name',
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates Project with minimum valid values
 */
export function buildMinimalProject(): Project {
  return buildProject({
    code: 'A1',
    name: 'ABC',
    id: 'a',
    ticketsPath: 't',
  });
}

/**
 * Creates Project with complex DocumentConfig
 */
export function buildProjectWithComplexDocumentConfig(): ProjectConfig {
  return buildProjectConfig(
    {},
    {
      paths: ['docs/**/*.md', 'src/**/*.md', '*.md'],
      excludeFolders: ['node_modules', '.git', 'dist', 'build'],
      maxDepth: 5,
    }
  );
}

/**
 * Invalid fixtures for validation testing
 */
export const invalidFixtures = {
  project: {
    invalidCode: buildProject({ code: 'invalid' }),
    emptyName: buildProject({ name: '' }),
    emptyId: buildProject({ id: '' }),
    emptyTicketsPath: buildProject({ ticketsPath: '' }),
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
};

/**
 * Helper function for creating test data variations
 */

/**
 * Creates multiple projects with sequential IDs
 * @param count - Number of projects to create
 * @param baseCode - Base project code (will append number)
 * @returns Array of valid Project objects
 */
export function buildProjects(count: number, baseCode = 'PRJ'): Project[] {
  return Array.from({ length: count }, (_, i) =>
    buildProject({
      code: `${baseCode}${(i + 1).toString().padStart(2, '0')}`,
      id: `${baseCode.toLowerCase()}-${i + 1}`,
      name: `Project ${i + 1}`,
    })
  );
}