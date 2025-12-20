/**
 * MDT-101: Project Fixtures
 *
 * Test fixtures for project schemas - placeholder implementation
 */

let counter = 0;

export const ProjectFixture = {
  validProject: {
    id: 'test-project',
    project: {
      name: 'Test Project',
      path: '/test/path',
      configFile: '/test/path/.mdt-config.toml',
      active: true,
      description: 'Test project description'
    },
    metadata: {
      dateRegistered: '2024-01-01T00:00:00Z',
      lastAccessed: '2024-01-01T00:00:00Z',
      version: '1.0.0'
    }
  },

  minimal() {
    counter++;
    return {
      id: `minimal-project-${counter}`,
      project: {
        name: `Minimal Project ${counter}`,
        path: '/test/path',
        configFile: '/test/path/.mdt-config.toml',
        active: true,
        description: 'A minimal test project'
      },
      metadata: {
        dateRegistered: '2024-01-01T00:00:00Z',
        lastAccessed: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      }
    };
  },

  complete() {
    counter++;
    return {
      id: `complete-project-${counter}`,
      project: {
        name: `Complete Project ${counter}`,
        path: '/test/path',
        configFile: '/test/path/.mdt-config.toml',
        active: true,
        description: 'A complete test project with all fields'
      },
      metadata: {
        dateRegistered: '2024-01-01T00:00:00Z',
        lastAccessed: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        globalOnly: false
      },
      autoDiscovered: false,
      configPath: '/optional/config/path',
      registryFile: '/optional/registry/file',
      tickets: {
        codePattern: '{code}-{number}'
      },
      document: {
        paths: ['docs', 'src'],
        excludeFolders: ['node_modules', '.git'],
        maxDepth: 5
      }
    };
  },

  custom(overrides: any) {
    const base = this.minimal();
    return {
      ...base,
      ...overrides,
      project: {
        ...base.project,
        ...overrides.project
      },
      metadata: {
        ...base.metadata,
        ...overrides.metadata
      }
    };
  },

  array(count: number) {
    return Array.from({ length: count }, () => this.minimal());
  }
};