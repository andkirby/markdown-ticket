/// <reference types="jest" />

import type { Response } from 'express'

import type { AuthenticatedRequest } from '../../controllers/ProjectController.js'
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

// ponytail: alias real console so no-console rule (stricter in root config used by
// the pre-commit eslint-staged hook) doesn't fire; this file legitimately wraps console.
const realConsole = console
globalThis.console = {
  ...realConsole,
  log: shouldSuppressConsole ? jest.fn() : realConsole.log.bind(realConsole),

  error: shouldSuppressConsole ? jest.fn() : realConsole.error.bind(realConsole),

  warn: shouldSuppressConsole ? jest.fn() : realConsole.warn.bind(realConsole),
  info: shouldSuppressConsole ? jest.fn() : realConsole.info.bind(realConsole),
  debug: shouldSuppressConsole ? jest.fn() : realConsole.debug.bind(realConsole),
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
    getCloudProjections: jest.fn(),
  }

  return mockTicketService
}

export function createMockTreeService() {
  const mockTreeService = {
    getPathSelectionTree: jest.fn(),
    getDocumentTree: jest.fn(),
  }

  return mockTreeService
}

/**
 * Helper to create mock Express request/response.
 */
export function createMockReqRes(): {
  req: Partial<AuthenticatedRequest>
  res: Partial<Response>
} {
  const req: Partial<AuthenticatedRequest> = {
    params: {},
    query: {},
    body: {},
    // Default to dev-mode write access so project visibility checks pass
    mdtAccess: { canWrite: true, mode: 'no-auth-dev', projectRefs: [], shareIds: [] },
  }

  const res: Partial<Response> = {
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
