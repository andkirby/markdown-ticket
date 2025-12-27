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
  // Increase timeout for server startup (60s)
  jest.setTimeout(60000);
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
    // Note: We need to find the MONOREPO root (where root package.json with workspaces is)
    // The dev:server script is defined in the root package.json, not in the shared workspace
    // CONFIG_DIR env var tells server where to find test projects
    // IMPORTANT: Start server AFTER creating projects so it discovers them on startup
    testServer = new TestServer(testEnv.getPortConfig());

    // Find monorepo root by walking up from current directory
    // We look for a package.json with "workspaces" field
    let monorepoRoot = findProjectRoot();
    while (monorepoRoot !== '/') {
      const pkgPath = join(monorepoRoot, 'package.json');
      if (existsSync(pkgPath)) {
        const pkgContent = readFileSync(pkgPath, 'utf8');
        if (pkgContent.includes('"workspaces"')) {
          break; // Found the monorepo root
        }
      }
      const parent = join(monorepoRoot, '..');
      if (parent === monorepoRoot) break; // Reached filesystem root
      monorepoRoot = parent;
    }

    console.log('Monorepo root:', monorepoRoot);
    await testServer.start('backend', monorepoRoot);

    // Wait for server to be fully ready and initialize project discovery
    // Then poll until projects are discovered (fix race condition)
    console.log('Waiting for backend server to discover projects...');
    const port = testEnv.getPortConfig().backend;
    const maxAttempts = 30;
    const pollDelay = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${port}/api/projects?bypassCache=true`);
        if (response.ok) {
          const projects = await response.json();
          console.log(`Attempt ${attempt}: Found ${projects.length} projects`);

          // Check if our TEST project is discovered
          const testProject = projects.find((p: any) => p.id === 'TEST' || p.key === 'TEST');
          if (testProject) {
            console.log('✅ TEST project discovered by server');
            break;
          }

          if (attempt === maxAttempts) {
            throw new Error(`TEST project not discovered after ${maxAttempts} attempts. Found projects: ${JSON.stringify(projects)}`);
          }
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Failed to discover projects after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    }

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
    // Use bypassCache to avoid cached empty project list from server startup
    const response = await fetch(`http://localhost:${port}/api/projects?bypassCache=true`);

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
    const testProject = projects.find((p: any) => p.id === 'TEST' || p.key === 'TEST');
    expect(testProject).toBeDefined();
    expect(testProject.project?.name || testProject.name).toBe('Integration Test Project');
  });

  it('backend server discovers test-lib created CRs', async () => {
    const port = testEnv.getPortConfig().backend;
    const response = await fetch(`http://localhost:${port}/api/projects/TEST/crs?bypassCache=true`);

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
