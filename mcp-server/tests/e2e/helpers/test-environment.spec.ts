/**
 * Test Environment Tests
 *
 * Following TDD principles, these tests are written first to define the behavior
 * we want from the test-environment.ts module.
 *
 * RED phase: Tests will fail initially, then we implement minimal code to make them pass
 */

import { TestEnvironment } from './test-environment';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Test Environment', () => {
  let testEnv: TestEnvironment;

  afterEach(async () => {
    // Cleanup after each test if test environment exists
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  describe('Temporary Directory Creation', () => {
    it('GIVEN no existing config WHEN creating test env THEN create isolated directory', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();

      // When creating the test environment
      await testEnv.setup();

      // Then it should have a temp directory
      const tempDir = testEnv.getTempDir();
      expect(tempDir).toBeDefined();
      expect(tempDir).toBeTruthy();
      expect(typeof tempDir).toBe('string');

      // And the directory should exist
      expect(existsSync(tempDir)).toBe(true);
    });

    it('GIVEN test env created WHEN checking paths THEN they be absolute and unique', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();

      // Create a second environment to test uniqueness
      const testEnv2 = new TestEnvironment();

      await testEnv.setup();
      await testEnv2.setup();

      const tempDir1 = testEnv.getTempDir();
      const tempDir2 = testEnv2.getTempDir();

      // Paths should be absolute
      expect(tempDir1).toMatch(/^\/|^[A-Za-z]:\\/); // Unix or Windows absolute path
      expect(tempDir2).toMatch(/^\/|^[A-Za-z]:\\/);

      // Paths should be unique
      expect(tempDir1).not.toBe(tempDir2);

      // Cleanup second environment
      await testEnv2.cleanup();
    });
  });

  describe('Cleanup Operations', () => {
    it('GIVEN test env with files WHEN cleanup THEN remove all temporary files', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();
      await testEnv.setup();

      const tempDir = testEnv.getTempDir();

      // Create some test files
      const configDir = testEnv.getConfigDir();
      const projectDir = testEnv.createProjectDir('test-project');

      // Verify directories exist
      expect(existsSync(configDir)).toBe(true);
      expect(existsSync(projectDir)).toBe(true);

      // When cleanup is called
      await testEnv.cleanup();

      // Then all temporary files should be removed
      expect(existsSync(tempDir)).toBe(false);
      expect(existsSync(configDir)).toBe(false);
      expect(existsSync(projectDir)).toBe(false);
    });
  });

  describe('Project Structure Creation', () => {
    it('GIVEN test env WHEN creating project dir THEN create proper structure', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();
      await testEnv.setup();

      // When creating a project directory
      const projectDir = testEnv.createProjectDir('my-project');

      // Then it should be created within the temp directory
      expect(projectDir).toContain(testEnv.getTempDir());
      expect(projectDir).toContain('my-project');
      expect(existsSync(projectDir)).toBe(true);
    });

    it('GIVEN project dir WHEN creating files THEN they be in correct location', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();
      await testEnv.setup();

      const projectName = 'test-project';
      const projectDir = testEnv.createProjectDir(projectName);

      // Create the project structure
      testEnv.createProjectStructure(projectName, {
        'docs/CRs': true,
        '.mdt-config.toml': 'code = TEST\nname = "Test Project"',
        'README.md': '# Test Project'
      });

      // Verify structure was created correctly
      const docsPath = join(projectDir, 'docs', 'CRs');
      const configPath = join(projectDir, '.mdt-config.toml');
      const readmePath = join(projectDir, 'README.md');

      expect(existsSync(docsPath)).toBe(true);
      expect(existsSync(configPath)).toBe(true);
      expect(existsSync(readmePath)).toBe(true);
    });
  });

  describe('Config Directory', () => {
    it('GIVEN test env WHEN getting config dir THEN return proper path', async () => {
      // RED: This test will fail initially
      testEnv = new TestEnvironment();
      await testEnv.setup();

      // When getting config directory
      const configDir = testEnv.getConfigDir();

      // Then it should be within the temp directory
      expect(configDir).toContain(testEnv.getTempDir());
      expect(configDir).toContain('config');
      expect(existsSync(configDir)).toBe(true);
    });
  });
});