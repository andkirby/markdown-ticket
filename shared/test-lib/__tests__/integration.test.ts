/**
 * Integration tests for shared/test-lib
 *
 * Tests that:
 * 1. TestEnvironment creates isolated directories
 * 2. ProjectFactory creates projects with custom ticketsPath
 * 3. TestServer starts backend with CONFIG_DIR
 * 4. Backend server discovers test-lib created projects/CRs
 */

import { TestEnvironment, TestServer, ProjectFactory, findProjectRoot } from '../index.js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('shared/test-lib - Integration', () => {
  // Increase timeout for server startup (30s)
  jest.setTimeout(30000);
  let testEnv: TestEnvironment;
  let testServer: TestServer;
  let factory: ProjectFactory;

  beforeAll(async () => {
    // 1. Create isolated test environment with custom CONFIG_DIR
    testEnv = new TestEnvironment();
    await testEnv.setup();

    console.log('Test environment created:');
    console.log('  Temp dir:', testEnv.getTempDirectory());
    console.log('  Config dir:', testEnv.getConfigDirectory());
    console.log('  Ports:', testEnv.getPortConfig());

    // 2. Create project factory and test project
    factory = new ProjectFactory(testEnv);
    const project = await factory.createProject('empty', {
      name: 'Integration Test Project',
      code: 'TEST',
      ticketsPath: 'specs/tickets'
    });

    console.log('Project created:', project.key, 'at', project.path);

    // 3. Create a test CR
    const crResult = await factory.createTestCR('TEST', {
      title: 'Test Server Discovery',
      type: 'Feature Enhancement',
      content: 'Verify server discovers this CR'
    });

    console.log('CR created:', crResult.crCode, 'at', crResult.filePath);

    // Verify registry files were created
    const registryDir = join(testEnv.getConfigDirectory(), 'projects');
    console.log('Registry dir:', registryDir);
    console.log('Registry dir exists:', existsSync(registryDir));
    if (existsSync(registryDir)) {
      const files = readdirSync(registryDir);
      console.log('Registry files:', files);
    }

    // Wait for file system to sync
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Start backend server with CONFIG_DIR
    // Note: pass actual project root (where package.json is), not temp dir
    // CONFIG_DIR env var tells server where to find test projects
    // IMPORTANT: Start server AFTER creating projects so it discovers them on startup
    testServer = new TestServer(testEnv.getPortConfig());
    const projectRoot = findProjectRoot();
    await testServer.start('backend', projectRoot);

    // Wait a bit for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Backend server started on port', testEnv.getPortConfig().backend);
  });

  afterAll(async () => {
    // 5. Cleanup
    await testServer.stopAll();
    await testEnv.cleanup();
    console.log('Cleanup complete');
  });

  it('backend server discovers test-lib created project', async () => {
    // Verify server is still running before making request
    const isReady = await testServer.isReady('backend');
    console.log('Server ready:', isReady);

    const port = testEnv.getPortConfig().backend;
    const response = await fetch(`http://localhost:${port}/api/projects`);

    expect(response.ok).toBe(true);

    const projects = await response.json();
    console.log('Projects discovered:', projects);
    console.log('Number of projects:', projects.length);

    // Also check registry file content and project structure
    const registryDir = join(testEnv.getConfigDirectory(), 'projects');
    if (existsSync(registryDir)) {
      const files = readdirSync(registryDir);
      console.log('Registry files:', files);
      for (const file of files) {
        if (file.endsWith('.toml')) {
          const content = readFileSync(join(registryDir, file), 'utf8');
          console.log(`${file} content:`, content);
        }
      }
    }

    // Check if project directory and .mdt-config.toml exist
    const projectPath = join(testEnv.getTempDirectory(), 'projects', 'TEST');
    console.log('Project path exists:', existsSync(projectPath));
    const configPath = join(projectPath, '.mdt-config.toml');
    console.log('Project config exists:', existsSync(configPath));
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      console.log('Project config content:', configContent);
    }

    // Should find our TEST project
    const testProject = projects.find((p: any) => p.key === 'TEST');
    expect(testProject).toBeDefined();
    expect(testProject.name).toBe('Integration Test Project');
  });

  it('backend server discovers test-lib created CRs', async () => {
    const port = testEnv.getPortConfig().backend;
    const response = await fetch(`http://localhost:${port}/api/projects/TEST/crs`);

    expect(response.ok).toBe(true);

    const crs = await response.json();
    console.log('CRs discovered:', crs);

    // Should find our TEST-001 CR
    expect(crs).toHaveLength(1);
    expect(crs[0].code).toBe('TEST-001');
    expect(crs[0].title).toBe('Test Server Discovery');
  });

  it('CR file has correct filename with title slug', async () => {
    const port = testEnv.getPortConfig().backend;
    const response = await fetch(`http://localhost:${port}/api/projects/TEST/crs`);

    const crs = await response.json();

    // Filename should be: specs/tickets/TEST-001-test-server-discovery.md
    // (title slug: "Test Server Discovery" → "test-server-discovery")
    expect(crs[0].filePath).toContain('test-server-discovery.md');
    expect(crs[0].filePath).not.toContain('TEST-001.md'); // Should NOT be just the code
  });
});
