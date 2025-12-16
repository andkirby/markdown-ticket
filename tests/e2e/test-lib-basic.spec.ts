import { test, expect } from '@playwright/test';
import { TestEnvironment, TestServer, ProjectFactory, DEFAULT_TEST_PORTS } from '@mdt/shared/test-lib';

test.describe('Shared Test-Lib - Basic Imports and Setup', () => {
  test('should import all test-lib components correctly', async () => {
    // Verify all imports work
    expect(TestEnvironment).toBeDefined();
    expect(TestServer).toBeDefined();
    expect(ProjectFactory).toBeDefined();
    expect(DEFAULT_TEST_PORTS).toBeDefined();

    // Verify default ports structure
    expect(DEFAULT_TEST_PORTS).toHaveProperty('frontend');
    expect(DEFAULT_TEST_PORTS).toHaveProperty('backend');
    expect(DEFAULT_TEST_PORTS).toHaveProperty('mcp');

    console.log('✅ All test-lib imports successful');
    console.log('Default ports:', DEFAULT_TEST_PORTS);
  });

  test('should create test environment without errors', async () => {
    // Create test environment
    const testEnv = new TestEnvironment();

    // Verify initial state
    expect(testEnv).toBeDefined();

    // Setup the environment
    await testEnv.setup();

    // Verify setup completed
    expect(testEnv.getTempDirectory()).toBeDefined();
    expect(testEnv.getPortConfig()).toBeDefined();

    // Get port config
    const portConfig = testEnv.getPortConfig();
    expect(portConfig.frontend).toBeDefined();
    expect(portConfig.backend).toBeDefined();
    expect(portConfig.mcp).toBeDefined();

    // Ensure ports are different from default dev ports
    expect(portConfig.frontend).not.toBe(5173); // Default dev port
    expect(portConfig.backend).not.toBe(3001);   // Default dev port

    console.log('✅ Test environment created successfully');
    console.log('Port config:', portConfig);

    // Cleanup
    await testEnv.cleanup();
  });

  test('should create project factory without errors', async () => {
    // Create test environment first
    const testEnv = new TestEnvironment();
    await testEnv.setup();

    // Create project factory
    const projectFactory = new ProjectFactory(testEnv);
    expect(projectFactory).toBeDefined();

    console.log('✅ Project factory created successfully');

    // Cleanup
    await testEnv.cleanup();
  });

  test('should demonstrate full isolated environment workflow', async () => {
    console.log('Starting full isolated environment workflow test...');

    // 1. Set up isolated test environment
    const testEnv = new TestEnvironment();
    await testEnv.setup();
    console.log('✅ Test environment set up');

    // 2. Get port configuration
    const portConfig = testEnv.getPortConfig();
    console.log(`Port configuration - Frontend: ${portConfig.frontend}, Backend: ${portConfig.backend}`);

    // 3. Create project factory
    const projectFactory = new ProjectFactory(testEnv);

    // 4. Create test project (without servers for this basic test)
    const project = await projectFactory.createProject('empty', {
      name: 'Basic Test Project',
      code: 'BASIC',
      description: 'Project for basic test-lib verification',
      crPath: 'docs/CRs',
      repository: 'test-repo'
    });

    console.log(`✅ Test project created: ${project.key} at ${project.path}`);

    // 5. Create a test CR
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Basic Test CR',
      type: 'Feature Enhancement',
      priority: 'Low',
      status: 'Proposed',
      content: {
        description: 'Basic CR for testing test-lib functionality',
        rationale: 'Verify the test library works',
        solutionAnalysis: 'Simple test CR',
        implementationSpec: 'No implementation needed',
        acceptanceCriteria: ['- Test passes']
      }
    });

    console.log(`✅ Test CR created: ${crResult.crCode || crResult.code}`);

    // 6. Verify files exist
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check project config file exists
    const configPath = path.join(project.path, '.mdt-config.toml');
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);

    // Check CR file exists
    const crPath = path.join(project.path, 'docs', 'CRs', `${crResult.crCode || crResult.code}.md`);
    const crExists = await fs.access(crPath).then(() => true).catch(() => false);
    expect(crExists).toBe(true);

    console.log('✅ Project files verified');

    // 7. Cleanup
    await testEnv.cleanup();
    console.log('✅ Test environment cleaned up');

    console.log('🎉 Full isolated environment workflow completed successfully!');
  });
});