import { ProjectConfigService } from '../ProjectConfigService';
import { fileExists, readFile, writeFile } from '../../../utils/file-utils';
import { parse, stringify } from '../../../utils/toml';
import { buildConfigFilePath, buildRegistryFilePath } from '../../../utils/path-resolver';

jest.mock('../../../utils/file-utils');
jest.mock('../../../utils/toml');
jest.mock('../../../utils/path-resolver');

describe('ProjectConfigService', () => {
  let service: ProjectConfigService;

  beforeEach(() => {
    service = new ProjectConfigService(true);
    jest.clearAllMocks();
  });

  describe('getGlobalConfig', () => {
    it('should return default config when file does not exist', () => {
      (fileExists as jest.Mock).mockReturnValue(false);
      const config = service.getGlobalConfig();
      expect(config.discovery.autoDiscover).toBe(true);
    });

    it('should return parsed config when file exists', () => {
      (fileExists as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockReturnValue('discovery.autoDiscover = false');
      (parse as jest.Mock).mockReturnValue({ discovery: { autoDiscover: false } });

      const config = service.getGlobalConfig();
      expect(config.discovery.autoDiscover).toBe(false);
    });
  });

  describe('getProjectConfig', () => {
    it('should return null when config file does not exist', () => {
      (buildConfigFilePath as jest.Mock).mockReturnValue('/config.toml');
      (fileExists as jest.Mock).mockReturnValue(false);

      const config = service.getProjectConfig('/project');
      expect(config).toBeNull();
    });

    it('should return null on validation failure', () => {
      (buildConfigFilePath as jest.Mock).mockReturnValue('/config.toml');
      (fileExists as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockReturnValue('content');
      (parse as jest.Mock).mockReturnValue({ invalid: 'config' });

      const config = service.getProjectConfig('/project');
      expect(config).toBeNull();
    });
  });

  describe('createOrUpdateLocalConfig', () => {
    it('should skip creation in global-only mode', () => {
      service.createOrUpdateLocalConfig('proj', '/path', 'Name', 'CODE', undefined, undefined, true);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should throw error when project not found', () => {
      (buildRegistryFilePath as jest.Mock).mockReturnValue('/reg/proj.toml');
      (fileExists as jest.Mock).mockReturnValue(false);

      expect(() => service.updateProject('proj', {})).toThrow('not found in registry');
    });

    it('should update project when valid', () => {
      const data = { project: { path: '/proj' }, metadata: { lastAccessed: '2024-01-01' } };
      (buildRegistryFilePath as jest.Mock).mockReturnValue('/reg.toml');
      (buildConfigFilePath as jest.Mock).mockReturnValue('/proj/config.toml');
      (fileExists as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockReturnValue('toml');
      (parse as jest.Mock).mockReturnValue(data);
      service.updateProject('proj', { name: 'New' });
      expect(writeFile).toHaveBeenCalledTimes(2);
    });
  });
});