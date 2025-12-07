/// <reference types="jest" />

// Mock the dependencies before imports
jest.mock('@mdt/shared/services/ProjectService');
jest.mock('../../services/FileSystemService', () => ({
  FileSystemService: jest.fn().mockImplementation(() => ({
    buildProjectFileSystemTree: jest.fn().mockResolvedValue([])
  }))
}));

import request from 'supertest';
import express from 'express';
import { createProjectRouter } from '../../routes/projects';
import { TicketService } from '../../services/TicketService';
import { ProjectController } from '../../controllers/ProjectController';

// Import mocked classes
import { ProjectService } from '@mdt/shared/services/ProjectService';
import { FileSystemService } from '../../services/FileSystemService';

describe('API Integration Tests - CRUD Endpoints', () => {
  let app: express.Application;
  let mockProjectController: ProjectController;
  let mockTicketService: TicketService;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Create mock services
    const mockProjectService = new ProjectService() as any;
    const mockFileSystemService = new FileSystemService('') as jest.Mocked<FileSystemService>;
    mockTicketService = new TicketService({ getAllProjects: jest.fn() } as any);

    // Add projectDiscovery property to mock service
    mockProjectService.projectDiscovery = {
      getAllProjects: jest.fn()
    };

    // Create controller with all dependencies
    mockProjectController = new ProjectController(
      mockProjectService,
      mockFileSystemService,
      {} as any, // fileWatcher
      undefined, // ticketController
      mockTicketService
    );

    // Mount routes
    app.use('/api/projects', createProjectRouter(mockProjectController));
  });

  describe('GET /api/projects/:projectId/crs/:crId', () => {
    it('should return 200 with CR data', async () => {
      const mockCR = {
        code: 'TEST-001',
        title: 'Test CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: '# Test Content'
      };

      (mockTicketService.getCR as jest.Mock) = jest.fn().mockResolvedValue(mockCR);

      const response = await request(app)
        .get('/api/projects/test-project/crs/TEST-001')
        .expect(200);

      expect(response.body).toEqual(mockCR);
    });

    it('should return 404 when projectId is missing', async () => {
      await request(app)
        .get('/api/projects//crs/TEST-001')
        .expect(404);
    });

    it('should return 404 when CR not found', async () => {
      (mockTicketService.getCR as jest.Mock) = jest.fn().mockRejectedValue(new Error('CR not found'));

      const response = await request(app)
        .get('/api/projects/test-project/crs/TEST-999')
        .expect(404);

      expect(response.body).toEqual({ error: 'CR not found' });
    });
  });

  describe('POST /api/projects/:projectId/crs', () => {
    it('should create a new CR', async () => {
      const newCR = {
        title: 'New Feature',
        type: 'Feature Enhancement',
        priority: 'High'
      };

      const createdCR = {
        success: true,
        message: 'CR created successfully',
        crCode: 'TEST-002',
        filename: 'TEST-002.md',
        path: '/test/TEST-002.md'
      };

      (mockTicketService.createCR as jest.Mock) = jest.fn().mockResolvedValue(createdCR);

      const response = await request(app)
        .post('/api/projects/test-project/crs')
        .send(newCR)
        .expect(201);

      expect(response.body).toEqual(createdCR);
    });
  });

  describe('PATCH /api/projects/:projectId/crs/:crId', () => {
    it('should update CR partially', async () => {
      const updateData = { status: 'In Progress' };

      const updatedCR = {
        success: true,
        message: 'CR updated successfully',
        updatedFields: ['status'],
        projectId: 'test-project',
        crId: 'TEST-001'
      };

      (mockTicketService.updateCRPartial as jest.Mock) = jest.fn().mockResolvedValue(updatedCR);

      const response = await request(app)
        .patch('/api/projects/test-project/crs/TEST-001')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedCR);
    });

    it('should return 400 for invalid status transition', async () => {
      (mockTicketService.updateCRPartial as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Invalid status transition')
      );

      const response = await request(app)
        .patch('/api/projects/test-project/crs/TEST-001')
        .send({ status: 'InvalidStatus' })
        .expect(400);

      expect(response.body.error).toContain('Invalid status transition');
    });
  });

  describe('PUT /api/projects/:projectId/crs/:crId', () => {
    it('should update CR fully (using updateCRPartial)', async () => {
      const updateData = {
        title: 'Updated Title',
        status: 'Implemented'
      };

      const updatedCR = {
        success: true,
        message: 'CR updated successfully',
        updatedFields: ['title', 'status'],
        projectId: 'test-project',
        crId: 'TEST-001'
      };

      (mockTicketService.updateCRPartial as jest.Mock) = jest.fn().mockResolvedValue(updatedCR);

      const response = await request(app)
        .put('/api/projects/test-project/crs/TEST-001')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedCR);
    });
  });

  describe('DELETE /api/projects/:projectId/crs/:crId', () => {
    it('should delete CR', async () => {
      const deleteResult = {
        success: true,
        message: 'CR deleted successfully',
        filename: 'TEST-001.md'
      };

      (mockTicketService.deleteCR as jest.Mock) = jest.fn().mockResolvedValue(deleteResult);

      const response = await request(app)
        .delete('/api/projects/test-project/crs/TEST-001')
        .expect(200);

      expect(response.body).toEqual(deleteResult);
    });

    it('should return 500 when trying to delete non-existent CR', async () => {
      (mockTicketService.deleteCR as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('CR not found')
      );

      const response = await request(app)
        .delete('/api/projects/test-project/crs/TEST-999')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to delete CR',
        details: 'CR not found'
      });
    });
  });
});

// Test for error handling
describe('API Error Handling', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create a mock controller that throws errors
    const mockProjectService = {
      getAllProjects: jest.fn(),
      getProjectConfig: jest.fn(),
      getProjectCRs: jest.fn(),
      getSystemDirectories: jest.fn(),
      configureDocuments: jest.fn(),
      checkDirectoryExists: jest.fn(),
      projectDiscovery: { getAllProjects: jest.fn() }
    } as any;

    const mockController = new ProjectController(
      mockProjectService,
      {
        buildProjectFileSystemTree: jest.fn()
      } as any,
      {} as any
    );

    app.use('/api/projects', createProjectRouter(mockController));
  });

  it('should handle internal server errors', async () => {
    const response = await request(app)
      .get('/api/projects/test-project/crs/TEST-001')
      .expect(501);

    expect(response.body).toHaveProperty('error');
  });
});