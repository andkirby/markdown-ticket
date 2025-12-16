/**
 * Tests for Configuration Validation functionality
 * Behavioral tests for configuration validation and consistency
 */

import {
  TEST_PROJECTS,
  runProjectCreate,
  runProjectList,
  cleanupAllTestProjects,
  cleanupTestProject,
  readLocalConfig,
  readGlobalRegistryEntry,
  configHasRequiredFields,
  configHasValidCode
} from './helpers/test-utils';

describe('configuration validation', () => {
  const testProject = TEST_PROJECTS.valid;

  beforeAll(async () => {
    await cleanupAllTestProjects();
  });

  afterAll(async () => {
    await cleanupAllTestProjects();
  });

  describe('when configuration is generated', () => {
    beforeEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    afterEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    it('should validate generated configuration schema', async () => {
      // Arrange & Act
      const result = await runProjectCreate({
        name: testProject.name,
        code: testProject.code,
        path: testProject.path
      });

      // Assert CLI succeeded
      expect(result.success).toBe(true);

      // Verify local configuration schema
      const localConfig = readLocalConfig(testProject.path);
      expect(localConfig).not.toBeNull();
      expect(configHasRequiredFields(localConfig)).toBe(true);

      // Verify specific field types and values
      const { project } = localConfig;
      expect(typeof project.name).toBe('string');
      expect(typeof project.code).toBe('string');
      expect(typeof project.id).toBe('string');
      expect(typeof project.active).toBe('boolean');
      expect(project.name).toBe(testProject.name);
      expect(project.code).toBe(testProject.code);
      expect(project.active).toBe(true);

      // Verify document configuration
      expect(project.document).toBeDefined();
      expect(Array.isArray(project.document.paths)).toBe(true);
      expect(Array.isArray(project.document.excludeFolders)).toBe(true);
      expect(typeof project.document.maxDepth).toBe('number');
    });
  });

  describe('project code validation', () => {
    it('should enforce 2-5 uppercase letter format', async () => {
      const validCodes = ['AB', 'XYZ', 'TEST', 'ABCDE'];
      const invalidCodes = ['A', 'ABCDEF', 'Abc', 'A1B', 'A_B', 'TEST-123'];

      // Test valid codes
      for (const code of validCodes) {
        expect(configHasValidCode(code)).toBe(true);
      }

      // Test invalid codes
      for (const code of invalidCodes) {
        expect(configHasValidCode(code)).toBe(false);
      }
    });

    it('should accept valid codes during project creation', async () => {
      const validCodes = [
        { code: 'AB', description: 'two letters' },
        { code: 'XYZ', description: 'three letters' }
      ];

      for (const { code, description } of validCodes) {
        const testPath = `/tmp/test-valid-${code.toLowerCase()}`;

        const result = await runProjectCreate({
          name: `Valid ${description} Project`,
          code: code,
          path: testPath
        });

        expect(result.success).toBe(true);

        // Verify the code was stored correctly
        const config = readLocalConfig(testPath);
        expect(config).not.toBeNull();
        expect(config.project.code).toBe(code);

        // Cleanup
        await cleanupTestProject(testPath);
      }
    });
  });

  describe('configuration consistency', () => {
    beforeEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    afterEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    it('should ensure CLI output matches configuration values', async () => {
      // Arrange - Create a project
      const createResult = await runProjectCreate({
        name: testProject.name,
        code: testProject.code,
        path: testProject.path
      });

      expect(createResult.success).toBe(true);

      // Act - List projects
      const listResult = await runProjectList();

      // Assert - Verify output contains expected values
      expect(listResult.success).toBe(true);
      expect(listResult.stdout).toContain(testProject.code);
      expect(listResult.stdout).toContain(testProject.name);

      // Verify configuration matches
      const config = readLocalConfig(testProject.path);
      const globalEntry = readGlobalRegistryEntry(testProject.code);

      expect(config.project.name).toBe(testProject.name);
      expect(config.project.code).toBe(testProject.code);
      expect(globalEntry.project.path).toBe(testProject.path);
    });
  });
});