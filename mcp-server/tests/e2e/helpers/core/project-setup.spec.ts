/**
 * Project Setup Tests
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { TestEnvironment } from '../test-environment';
import { ProjectSetup } from './project-setup';
import { ProjectFactoryError } from '../types/project-factory-types';
import { FileHelper } from '../utils/file-helper';

describe('ProjectSetup', () => {
  let testEnv: TestEnvironment;
  let projectSetup: ProjectSetup;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    projectSetup = new ProjectSetup({ testEnv });
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('createProjectStructure', () => {
    it('should create a complete project structure', async () => {
      const projectCode = 'TEST';
      const projectName = 'Test Project';

      const projectDir = await projectSetup.createProjectStructure(projectCode, projectName);

      // Verify project directory exists
      expect(existsSync(projectDir)).toBe(true);

      // Verify .mdt-config.toml exists
      const configPath = join(projectDir, '.mdt-config.toml');
      expect(existsSync(configPath)).toBe(true);

      // Verify README.md exists
      const readmePath = join(projectDir, 'README.md');
      expect(existsSync(readmePath)).toBe(true);

      // Verify .mdt-next counter file exists
      const counterPath = join(projectDir, '.mdt-next');
      expect(existsSync(counterPath)).toBe(true);

      // Verify CR directory exists
      const crDir = join(projectDir, 'docs', 'CRs');
      expect(existsSync(crDir)).toBe(true);
    });

    it('should create project with custom configuration', async () => {
      const projectCode = 'CUSTOM';
      const projectName = 'Custom Project';
      const customConfig = {
        crPath: 'tickets',
        documentPaths: ['docs', 'specs'],
        excludeFolders: ['node_modules', '.git', 'build'],
        repository: 'https://github.com/example/custom-project'
      };

      const projectDir = await projectSetup.createProjectStructure(projectCode, projectName, customConfig);

      // Read the config file
      const configPath = join(projectDir, '.mdt-config.toml');
      const configContent = FileHelper.readFile(configPath);

      // Verify custom configuration is applied
      expect(configContent).toContain('ticketsPath = "tickets"');
      expect(configContent).toContain('repository = "https://github.com/example/custom-project"');
      expect(configContent).toContain('"specs"');
    });

    it('should register project in MCP config directory', async () => {
      const projectCode = 'REG';
      const projectName = 'Registered Project';

      const projectDir = await projectSetup.createProjectStructure(projectCode, projectName);

      // Verify project registration file exists
      const projectsDir = join(testEnv.getConfigDir(), 'projects');
      const registrationPath = join(projectsDir, `${projectCode}.toml`);
      expect(existsSync(registrationPath)).toBe(true);

      // Verify registration content
      const registrationContent = FileHelper.readFile(registrationPath);
      expect(registrationContent).toContain(`path = "${projectDir}"`);
      expect(registrationContent).toContain('active = true');
    });

    it('should validate project code', async () => {
      await expect(
        projectSetup.createProjectStructure('', 'Test Project')
      ).rejects.toThrow('Project code is required');

      await expect(
        projectSetup.createProjectStructure('123-INVALID', 'Test Project')
      ).rejects.toThrow(/Project code '.*' must be 2-10 uppercase letters/);
    });

    it('should validate project name', async () => {
      await expect(
        projectSetup.createProjectStructure('TEST', '')
      ).rejects.toThrow('Project name is required');
    });
  });

  describe('createProjectDirectories', () => {
    it('should create only directory structure', () => {
      const projectCode = 'DIRS';
      const projectDir = projectSetup.createProjectDirectories(projectCode);

      // Verify directory exists
      expect(existsSync(projectDir)).toBe(true);

      // Verify CR directory exists
      const crDir = join(projectDir, 'docs', 'CRs');
      expect(existsSync(crDir)).toBe(true);

      // Verify no config files are created
      expect(existsSync(join(projectDir, '.mdt-config.toml'))).toBe(false);
      expect(existsSync(join(projectDir, 'README.md'))).toBe(false);
    });

    it('should use custom CR path', () => {
      const projectCode = 'CUSTOM';
      const config = { crPath: 'custom-tickets' };
      const projectDir = projectSetup.createProjectDirectories(projectCode, config);

      // Verify custom CR directory exists
      const crDir = join(projectDir, 'custom-tickets');
      expect(existsSync(crDir)).toBe(true);
    });
  });

  describe('writeConfigurationFiles', () => {
    it('should write configuration files to existing directory', () => {
      // Create empty project directory first
      const projectCode = 'CONFIG';
      const projectDir = projectSetup.createProjectDirectories(projectCode);

      // Write configuration files
      projectSetup.writeConfigurationFiles(projectDir, projectCode, 'Config Test Project');

      // Verify files are created
      expect(existsSync(join(projectDir, '.mdt-config.toml'))).toBe(true);
      expect(existsSync(join(projectDir, 'README.md'))).toBe(true);
      expect(existsSync(join(projectDir, '.mdt-next'))).toBe(true);
    });
  });

  describe('registerProject', () => {
    it('should register project without creating structure', () => {
      const projectCode = 'REGONLY';
      const projectPath = '/fake/path';

      projectSetup.registerProject(projectCode, projectPath);

      // Verify registration file exists
      const projectsDir = join(testEnv.getConfigDir(), 'projects');
      const registrationPath = join(projectsDir, `${projectCode}.toml`);
      expect(existsSync(registrationPath)).toBe(true);

      // Verify registration content
      const registrationContent = FileHelper.readFile(registrationPath);
      expect(registrationContent).toContain(`path = "${projectPath}"`);
    });
  });

  describe('utility methods', () => {
    it('should provide access to defaults', () => {
      const defaults = projectSetup.getDefaults();
      expect(defaults.crPath).toBe('docs/CRs');
      expect(defaults.documentPaths).toContain('docs');
      expect(defaults.excludeFolders).toContain('node_modules');
    });

    it('should provide access to dependencies', () => {
      expect(projectSetup.getConfigGenerator()).toBeDefined();
      expect(projectSetup.getTestEnvironment()).toBe(testEnv);
    });
  });
});