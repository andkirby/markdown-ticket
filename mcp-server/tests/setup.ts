import process from 'node:process'

// Jest setup file for MCP server tests

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    // Add specific mocks as needed
  },
}))

// Mock chokidar (file watcher)
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}))

// Mock console methods globally for cleaner test output
globalThis.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

// Set test environment
process.env.NODE_ENV = 'test'
process.env.MCP_HTTP_ENABLED = 'true'

// Mock process.exit to prevent test suite from terminating
const mockExit = jest.fn()
process.exit = mockExit as any

// Mock shared services that might cause issues
jest.mock('@mdt/shared/services/ProjectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    getAllProjects: jest.fn(),
    getProjectConfig: jest.fn(),
    projectDiscovery: {
      getAllProjects: jest.fn(),
    },
  })),
}))
