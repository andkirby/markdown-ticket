import { ProjectDiscoveryService } from '../ProjectDiscoveryService';
import { Project } from '../../../models/Project';

describe('ProjectDiscoveryService', () => {
  let service: ProjectDiscoveryService;
  let mockRegistry: any;
  let mockLoader: any;
  let mockScanner: any;

  beforeEach(() => {
    mockRegistry = { getRegisteredProjects: jest.fn(), registerProject: jest.fn() };
    mockLoader = { getProjectConfig: jest.fn() };
    mockScanner = { autoDiscoverProjects: jest.fn() };

    service = new ProjectDiscoveryService(true);
    (service as any).registry = mockRegistry;
    (service as any).configLoader = mockLoader;
    (service as any).scanner = mockScanner;
  });

  describe('getRegisteredProjects', () => {
    it('should return empty array when no projects registered', () => {
      mockRegistry.getRegisteredProjects.mockReturnValue([]);
      const projects = service.getRegisteredProjects();
      expect(projects).toEqual([]);
    });

    it('should handle valid registered project', () => {
      const registryEntry = {
        file: 'test.toml',
        data: { project: { path: '/path/to/test' }, metadata: { dateRegistered: '2024-01-01' } }
      };
      const localConfig = { project: { name: 'Test', code: 'TEST', startNumber: 10 } };

      mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry]);
      mockLoader.getProjectConfig.mockReturnValue(localConfig);

      const projects = service.getRegisteredProjects();
      expect(projects[0].project.name).toBe('Test');
      expect(projects[0].project.code).toBe('TEST');
    });

    it('should generate code when not in local config', () => {
      const registryEntry = { file: 'myproj.toml', data: { project: { path: '/path' } } };

      mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry]);
      mockLoader.getProjectConfig.mockReturnValue({ project: { name: 'My' } });

      const projects = service.getRegisteredProjects();
      expect(projects[0].project.code).toBe('MYPRO');
    });
  });

  describe('autoDiscoverProjects', () => {
    it('should delegate to scanner', () => {
      const mockProjects = [{ id: 'test', project: { name: 'Test' } } as Project];
      mockScanner.autoDiscoverProjects.mockReturnValue(mockProjects);

      const result = service.autoDiscoverProjects(['/search']);
      expect(mockScanner.autoDiscoverProjects).toHaveBeenCalledWith(['/search']);
      expect(result).toEqual(mockProjects);
    });
  });

  describe('registerProject', () => {
    it('should delegate to registry', () => {
      const project = { id: 'test', project: { name: 'Test' } } as Project;
      service.registerProject(project);
      expect(mockRegistry.registerProject).toHaveBeenCalledWith(project);
    });
  });
});