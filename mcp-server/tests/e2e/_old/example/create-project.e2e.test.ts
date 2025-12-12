/**
 * E2E Tests for Project Creation API
 * Demonstrates simple project creation in E2E tests
 */

import {MCPTestClient} from '../helpers/mcpClient';
import {createTestEnvironment, cleanupTestEnvironment, TestEnvironment} from '../helpers/testEnvironment';

describe('Project Creation API', () => {
    let client: MCPTestClient;
    let testEnv: TestEnvironment;

    beforeEach(async () => {
        testEnv = await createTestEnvironment();
        client = new MCPTestClient(undefined, {
            CONFIG_DIR: testEnv.configDir,
            MCP_CACHE_ENABLED: 'false'
        });
        await client.start();
    });

    afterEach(async () => {
        if (client) {
            await client.stop();
        }
        if (testEnv) {
            await cleanupTestEnvironment(testEnv);
        }
    });

    describe('Simple Project Creation', () => {
        test('should create a test project with default settings', async () => {
            // Use the simple project creation API
            const project = await testEnv.createProject('My Test Project');

            expect(project).toBeDefined();
            expect(project.project.name).toBe('My Test Project');
            expect(project.project.code).toBe('MTP'); // Generated from name
            expect(project.project.active).toBe(true);
        });

        test('should create a test project with custom settings', async () => {
            // Create project with custom configuration
            const project = await testEnv.createProject('Custom Project', {
                code: 'CUST',
                description: 'A custom test project',
                repository: 'https://github.com/test/custom-project',
                ticketsPath: 'tickets'
            });

            expect(project.project.name).toBe('Custom Project');
            expect(project.project.code).toBe('CUST');
            expect(project.project.description).toBe('A custom test project');
            expect(project.project.repository).toBe('https://github.com/test/custom-project');
        });

        test('should verify created project appears in list_projects', async () => {
            // Create a project
            await testEnv.createProject('Listed Project', {
                code: 'LIST'
            });

            // Create a NEW client to force a fresh scan (projects are cached)
            const newClient = new MCPTestClient(undefined, {
                CONFIG_DIR: testEnv.configDir,
                MCP_CACHE_ENABLED: 'false'
            });
            await newClient.start();

            try {
                // List projects and verify our project appears
                const result = await newClient.callTool('list_projects');

                expect(typeof result).toBe('string');
                expect(result).toContain('LIST');
                expect(result).toContain('Listed Project');
            } finally {
                await newClient.stop();
            }
        });

        test('should get project info for created project', async () => {
            // Create a project
            const project = await testEnv.createProject('Info Project', {
                code: 'INFO',
                description: 'Project for testing get_project_info'
            });

            // Create a NEW client to force a fresh scan
            const newClient = new MCPTestClient(undefined, {
                CONFIG_DIR: testEnv.configDir,
                MCP_CACHE_ENABLED: 'false'
            });
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
            const project1 = await testEnv.createProject('First Project');
            const project2 = await testEnv.createProject('Second Project');
            const project3 = await testEnv.createProject('Third Project');

            expect(project1.project.name).toBe('First Project');
            expect(project2.project.name).toBe('Second Project');
            expect(project3.project.name).toBe('Third Project');

            // Create a NEW client to force a fresh scan
            const newClient = new MCPTestClient(undefined, {
                CONFIG_DIR: testEnv.configDir,
                MCP_CACHE_ENABLED: 'false'
            });
            await newClient.start();

            try {
                // Verify all appear in list
                const result = await newClient.callTool('list_projects');
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
            const project = await testEnv.createProject('CR Project', {
                code: 'CRPR'
            });

            // Register project in test environment for CR creation
            await testEnv.registerProject('CRPR', {
                name: 'CR Project',
                code: 'CRPR',
                crPath: 'docs/CRs'
            });

            // Create a CR in the project
            await testEnv.createCR('CRPR-001', {
                title: 'Test CR in created project',
                type: 'Feature Enhancement',
                priority: 'High'
            });

            // Create a NEW client to force a fresh scan
            const newClient = new MCPTestClient(undefined, {
                CONFIG_DIR: testEnv.configDir,
                MCP_CACHE_ENABLED: 'false'
            });
            await newClient.start();

            try {
                // Verify CR exists by listing CRs
                const result = await newClient.callTool('list_crs', {
                    project: 'CRPR'
                });

                expect(typeof result).toBe('string');
                expect(result).toContain('CRPR-001');
                expect(result).toContain('CRPR 001'); // Title extracted from CR file
            } finally {
                await newClient.stop();
            }
        });
    });

    describe('Project Creation Validation', () => {
        test('should handle duplicate project codes', async () => {
            // Create first project
            await testEnv.createProject('Duplicate', {
                code: 'DUP'
            });

            // Attempt to create second project with same code should throw
            await expect(
                testEnv.createProject('Another Duplicate', {
                    code: 'DUP'
                })
            ).rejects.toThrow('Project with code "DUP" already exists');
        });
    });
});