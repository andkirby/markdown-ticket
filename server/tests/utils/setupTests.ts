/* eslint-disable no-console */
/// <reference types="jest" />

// Mock TreeService as a proper class mock before importing FileSystemService
// Use requireActual to get the real implementation for integration tests
import process from 'node:process'

jest.mock('../../services/TreeService', () => {
  const RealTreeService = jest.requireActual('../../services/TreeService')

  return {
    TreeService: RealTreeService.TreeService,
  }
})

// Mock console methods to reduce noise in tests
// Use jest.fn() to suppress output; set DEBUG=true to see logs during debugging
const shouldSuppressConsole = process.env.DEBUG !== 'true'

globalThis.console = {
  ...console,
  log: shouldSuppressConsole ? jest.fn() : console.log.bind(console),
  error: shouldSuppressConsole ? jest.fn() : console.error.bind(console),
  warn: shouldSuppressConsole ? jest.fn() : console.warn.bind(console),
  info: shouldSuppressConsole ? jest.fn() : console.info.bind(console),
  debug: shouldSuppressConsole ? jest.fn() : console.debug.bind(console),
}

// Mock process.env for consistent test environment
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'

/**
 * Create test fixtures.
 */
export function createMockProjectService() {
  const mockProjectService = {
    getAllProjects: jest.fn(),
    getProjectConfig: jest.fn(),
    getProjectCRs: jest.fn(),
    getSystemDirectories: jest.fn(),
    configureDocuments: jest.fn(),
    checkDirectoryExists: jest.fn(),
    projectDiscovery: {
      getAllProjects: jest.fn(),
    },
  }

  return mockProjectService
}

export function createMockTicketService() {
  const mockTicketService = {
    getCR: jest.fn(),
    createCR: jest.fn(),
    updateCRPartial: jest.fn(),
    deleteCR: jest.fn(),
    getProjectCRs: jest.fn(),
  }

  return mockTicketService
}

export function createMockFileSystemService() {
  const mockFileSystemService = {
    buildProjectFileSystemTree: jest.fn(),
  }

  return mockFileSystemService
}

/**
 * Helper to create mock Express request/response.
 */
export function createMockReqRes() {
  const req = {
    params: {},
    query: {},
    body: {},
  }

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }

  return { req, res }
}

// Common test data
export const mockProject = {
  id: 'test-project',
  project: {
    name: 'Test Project',
    code: 'TEST',
    path: '/test/path',
    active: true,
  },
}

export const mockCR = {
  code: 'TEST-001',
  title: 'Test CR',
  type: 'Feature Enhancement',
  priority: 'Medium',
  status: 'Proposed',
  content: '## 1. Description\n\nTest description',
  filePath: '/test/path/docs/CRs/TEST-001.md',
  modified: new Date(),
  created: new Date(),
}
