/**
 * E2E Tests for Project Creation API
 * Demonstrates simple project creation in E2E tests
 */

import {MCPClient} from '../../helpers/mcp-client';
import {TestEnvironment} from '../../helpers/test-environment';
import {ProjectFactory} from '../../helpers/project-factory';

describe('Project Creation API', () => {
    let client: MCPClient;
    let testEnv: TestEnvironment;
    let projectFactory: ProjectFactory;

    beforeEach(async () => {
        testEnv = new TestEnvironment();
        await testEnv.setup();
        client = new MCPClient(testEnv, { transport: 'stdio' });
        await client.start();
        projectFactory = new ProjectFactory(testEnv, client);
    });

    afterEach(async () => {
        if (client) {
            await client.stop();
        }
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    describe('Simple Project Creation', () => {
        test('should create a test project with default settings', async () => {
            // Use the simple project creation API
            const projectDir = await projectFactory.createProjectStructure('MTP', 'My Test Project');

            expect(projectDir).toBeDefined();
            expect(typeof projectDir).toBe('string');
        });

        test('should create a test project with custom settings', async () => {
            // Create project with custom configuration
            const projectDir = await projectFactory.createProjectStructure('CUST', 'Custom Project', {
                description: 'A custom test project',
                repository: 'https://github.com/test/custom-project',
                crPath: 'tickets'
            });

            expect(projectDir).toBeDefined();
            expect(typeof projectDir).toBe('string');
        });

        test('should verify created project appears in list_projects', async () => {
            // Create a project
            await projectFactory.createProjectStructure('LIST', 'Listed Project');

            // Create a NEW client to force a fresh scan (projects are cached)
            const newClient = new MCPClient(testEnv, { transport: 'stdio' });
            await newClient.start();

            try {
                // List projects and verify our project appears
                const result = await newClient.callTool('list_projects', {});

                expect(typeof result).toBe('string');
                expect(result).toContain('LIST');
                expect(result).toContain('Listed Project');
            } finally {
                await newClient.stop();
            }
        });

        test('should get project info for created project', async () => {
            // Create a project
            await projectFactory.createProjectStructure('INFO', 'Info Project', {
                description: 'Project for testing get_project_info'
            });

            // Create a NEW client to force a fresh scan
            const newClient = new MCPClient(testEnv, { transport: 'stdio' });
            await newClient.start();

            try {
                // Get project info
                const result = await newClient.callTool('get_project_info', {
                    key: 'INFO'
                });

                expect(typeof result).toBe('string');
                expect(result).toContain('INFO');
                expect(result).toContain('Info Project');
                expect(result).toContain('Project for testing get_project_info');
            } finally {
                await newClient.stop();
            }
        });

        test('should create multiple projects', async () => {
            // Create multiple projects
            const project1 = await projectFactory.createProjectStructure('FPX', 'First Project');
            const project2 = await projectFactory.createProjectStructure('SPX', 'Second Project');
            const project3 = await projectFactory.createProjectStructure('TPX', 'Third Project');

            expect(project1).toBeDefined();
            expect(project2).toBeDefined();
            expect(project3).toBeDefined();

            // Create a NEW client to force a fresh scan
            const newClient = new MCPClient(testEnv, { transport: 'stdio' });
            await newClient.start();

            try {
                // Verify all appear in list
                const result = await newClient.callTool('list_projects', {});
                expect(typeof result).toBe('string');
                expect(result).toContain('FPX');
                expect(result).toContain('SPX');
                expect(result).toContain('TPX');
            } finally {
                await newClient.stop();
            }
        });
    });

    describe('Project Creation with CRs', () => {
        test('should create project and CRs in same test', async () => {
            // Create project
            await projectFactory.createProjectStructure('CRPR', 'CR Project');

            // Create a CR in the project
            await projectFactory.createTestCR('CRPR', {
                title: 'Test CR in created project',
                type: 'Feature Enhancement',
                priority: 'High',
                content: '## 1. Description\n\nTest content for the CR.'
            });

            // Create a NEW client to force a fresh scan
            const newClient = new MCPClient(testEnv, { transport: 'stdio' });
            await newClient.start();

            try {
                // Verify CR exists by listing CRs
                const result = await newClient.callTool('list_crs', {
                    project: 'CRPR'
                });

                expect(typeof result).toBe('string');
                expect(result).toContain('CRPR-001');
            } finally {
                await newClient.stop();
            }
        });
    });

    describe('Project Creation Validation', () => {
        test('should handle duplicate project codes', async () => {
            // Create first project
            await projectFactory.createProjectStructure('DUP', 'Duplicate');

            // Attempt to create second project with same code should throw
            await expect(
                projectFactory.createProjectStructure('DUP', 'Another Duplicate')
            ).rejects.toThrow();
        });
    });
});