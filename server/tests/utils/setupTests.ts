/// <reference types="jest" />

// Mock TreeService before importing FileSystemService
jest.mock('../../services/TreeService', () => ({
  TreeService: {
    buildTree: jest.fn(),
    buildFileSystemTree: jest.fn(),
    flattenTree: jest.fn(),
    filterTree: jest.fn(),
  }
}));

import { ProjectService } from '@mdt/shared/services/ProjectService';
import { TicketService } from '../../services/TicketService';
import { ProjectController } from '../../controllers/ProjectController';
import { FileSystemService } from '../../services/FileSystemService';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock process.env for consistent test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Create test fixtures
export const createMockProjectService = () => {
  const mockProjectService = {
    getAllProjects: jest.fn(),
    getProjectConfig: jest.fn(),
    getProjectCRs: jest.fn(),
    getSystemDirectories: jest.fn(),
    configureDocuments: jest.fn(),
    checkDirectoryExists: jest.fn(),
    projectDiscovery: {
      getAllProjects: jest.fn(),
    }
  };
  return mockProjectService;
};

export const createMockTicketService = () => {
  const mockTicketService = {
    getCR: jest.fn(),
    createCR: jest.fn(),
    updateCRPartial: jest.fn(),
    deleteCR: jest.fn(),
    getProjectCRs: jest.fn(),
  };
  return mockTicketService;
};

export const createMockFileSystemService = () => {
  const mockFileSystemService = {
    buildProjectFileSystemTree: jest.fn(),
  };
  return mockFileSystemService;
};

// Helper to create mock Express request/response
export const createMockReqRes = () => {
  const req = {
    params: {},
    query: {},
    body: {},
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  return { req, res };
};

// Common test data
export const mockProject = {
  id: 'test-project',
  project: {
    name: 'Test Project',
    code: 'TEST',
    path: '/test/path',
    active: true,
  }
};

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
};