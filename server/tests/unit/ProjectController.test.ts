/// <reference types="jest" />

import { ProjectController } from '../../controllers/ProjectController.js';
import {
  createMockProjectService,
  createMockTicketService,
  createMockFileSystemService,
  createMockReqRes,
  mockProject,
  mockCR
} from '../utils/setupTests.js';

describe('ProjectController - CRUD Operations', () => {
  let projectController: ProjectController;
  let mockProjectService: any;
  let mockTicketService: any;
  let mockFileSystemService: any;

  beforeEach(() => {
    mockProjectService = createMockProjectService();
    mockTicketService = createMockTicketService();
    mockFileSystemService = createMockFileSystemService();

    projectController = new ProjectController(
      mockProjectService,
      mockFileSystemService,
      {} as any, // fileWatcher
      undefined, // ticketController
      mockTicketService
    );

    // Mock successful project lookup
    mockProjectService.getAllProjects.mockResolvedValue([mockProject]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCR', () => {
    it('should return 200 with CR data when successful', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-001' };

      mockTicketService.getCR.mockResolvedValue(mockCR);

      await projectController.getCR(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(mockCR);
      expect(mockTicketService.getCR).toHaveBeenCalledWith('test-project', 'TEST-001');
    });

    it('should return 400 when projectId is missing', async () => {
      const { req, res } = createMockReqRes();
      req.params = { crId: 'TEST-001' };

      await projectController.getCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project ID and CR ID are required' });
    });

    it('should return 400 when crId is missing', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project' };

      await projectController.getCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project ID and CR ID are required' });
    });

    it('should return 404 when CR not found', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-999' };

      mockTicketService.getCR.mockRejectedValue(new Error('CR not found'));

      await projectController.getCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'CR not found' });
    });

    it('should return 501 when ticketService is not available', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-001' };

      const controllerWithoutService = new ProjectController(
        mockProjectService,
        mockFileSystemService,
        {} as any
      );

      await controllerWithoutService.getCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ticket service not available for fetching CR' });
    });
  });

  describe('createCR', () => {
    it('should return 201 with created CR data', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project' };
      req.body = {
        title: 'New CR',
        type: 'Bug Fix',
        priority: 'High'
      };

      const createResult = {
        success: true,
        message: 'CR created successfully',
        crCode: 'TEST-002',
        filename: 'TEST-002.md',
        path: '/test/path/docs/CRs/TEST-002.md'
      };

      mockTicketService.createCR.mockResolvedValue(createResult);

      await projectController.createCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createResult);
      expect(mockTicketService.createCR).toHaveBeenCalledWith('test-project', req.body);
    });

    it('should return 400 when projectId is missing', async () => {
      const { req, res } = createMockReqRes();
      req.body = { title: 'New CR' };

      await projectController.createCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project ID is required' });
    });
  });

  describe('updateCR', () => {
    it('should return 200 with updated CR data', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-001' };
      req.body = { status: 'In Progress' };

      const updateResult = {
        success: true,
        message: 'CR updated successfully',
        updatedFields: ['status'],
        projectId: 'test-project',
        crId: 'TEST-001'
      };

      mockTicketService.updateCRPartial.mockResolvedValue(updateResult);

      await projectController.updateCR(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(updateResult);
      expect(mockTicketService.updateCRPartial).toHaveBeenCalledWith(
        'test-project',
        'TEST-001',
        { status: 'In Progress' }
      );
    });

    it('should return 400 when projectId is missing', async () => {
      const { req, res } = createMockReqRes();
      req.params = { crId: 'TEST-001' };
      req.body = { status: 'In Progress' };

      await projectController.updateCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project ID and CR ID are required' });
    });
  });

  describe('deleteCR', () => {
    it('should return 200 with deletion confirmation', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-001' };

      const deleteResult = {
        success: true,
        message: 'CR deleted successfully',
        filename: 'TEST-001.md'
      };

      mockTicketService.deleteCR.mockResolvedValue(deleteResult);

      await projectController.deleteCR(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(deleteResult);
      expect(mockTicketService.deleteCR).toHaveBeenCalledWith('test-project', 'TEST-001');
    });

    it('should return 400 when crId is missing', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project' };

      await projectController.deleteCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project ID and CR ID are required' });
    });

    it('should return 500 when delete operation fails', async () => {
      const { req, res } = createMockReqRes();
      req.params = { projectId: 'test-project', crId: 'TEST-001' };

      mockTicketService.deleteCR.mockRejectedValue(new Error('File system error'));

      await projectController.deleteCR(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete CR',
        details: 'File system error'
      });
    });
  });
});