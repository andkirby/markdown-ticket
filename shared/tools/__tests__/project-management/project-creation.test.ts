/**
 * Tests for Project Creation functionality
 * Behavioral tests for project creation and validation
 */

import {
  TEST_PROJECTS,
  runProjectCreate,
  cleanupAllTestProjects,
  cleanupTestProject,
  readLocalConfig,
  readGlobalRegistryEntry,
  configHasRequiredFields,
  projectExists
} from './helpers/test-utils';

describe('project:create', () => {
  // Cleanup after all tests
  afterAll(async () => {
    await cleanupAllTestProjects();
  });

  describe('when valid parameters are provided', () => {
    const testProject = TEST_PROJECTS.valid;

    beforeEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    afterEach(async () => {
      await cleanupTestProject(testProject.path);
    });

    it('should create local .mdt-config.toml with required fields', async () => {
      // Act
      const result = await runProjectCreate({
        name: testProject.name,
        code: testProject.code,
        path: testProject.path
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('successfully');

      // Verify local config was created
      const config = readLocalConfig(testProject.path);
      expect(config).not.toBeNull();
      expect(configHasRequiredFields(config)).toBe(true);
      expect(config.project.name).toBe(testProject.name);
      expect(config.project.code).toBe(testProject.code);

      // Verify project directory was created
      expect(projectExists(testProject.path)).toBe(true);
    });

    it('should create global registry entry with minimal reference', async () => {
      // Act
      const result = await runProjectCreate({
        name: testProject.name,
        code: testProject.code,
        path: testProject.path
      });

      // Assert
      expect(result.success).toBe(true);

      // Verify global registry entry
      const globalEntry = readGlobalRegistryEntry(testProject.code);
      expect(globalEntry).not.toBeNull();
      expect(globalEntry.project.path).toBe(testProject.path);
      expect(globalEntry.project.active).toBe(true);

      // Global entry should have minimal fields (not full project details)
      expect(globalEntry.project.name).toBeUndefined();
      expect(globalEntry.project.code).toBeUndefined();
    });
  });

  describe('when invalid project code is provided', () => {
    test.each([
      ['too short (1 char)', TEST_PROJECTS.invalidCodes.tooShort],
      ['too long (>5 chars)', TEST_PROJECTS.invalidCodes.tooLong],
      ['contains numbers', TEST_PROJECTS.invalidCodes.withNumbers],
      ['contains special characters', TEST_PROJECTS.invalidCodes.withSpecial]
    ])('should reject %s code: %s', async (description, invalidCode) => {
      // Act
      const result = await runProjectCreate({
        name: 'Test Project',
        code: invalidCode,
        path: '/tmp/test-invalid-code'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/validation|code|format/i);

      // Verify no files were created
      expect(projectExists('/tmp/test-invalid-code')).toBe(false);
    });
  });

  describe('when invalid path is provided', () => {
    it('should reject non-existent absolute path', async () => {
      const nonExistentPath = TEST_PROJECTS.invalidPaths.nonExistent;

      // Act
      const result = await runProjectCreate({
        name: 'Test Project',
        code: 'TEST',
        path: nonExistentPath
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/path|exist/i);
    });
  });
});