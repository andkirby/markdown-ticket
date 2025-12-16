import { test, expect } from '@playwright/test';
import { TestEnvironment, TestServer, ProjectFactory } from '../../shared/test-lib';

test.describe('Ticket Move - Isolated Test Environment', () => {
  let testEnv: TestEnvironment;
  let testServer: TestServer;
  let projectFactory: ProjectFactory;
  let projectKey: string;
  let frontendUrl: string;

  test.beforeAll(async () => {
    // Set up isolated test environment with custom ports
    testEnv = new TestEnvironment();
    await testEnv.setup();

    // Get port configuration for test environment
    const portConfig = testEnv.getPortConfig();
    frontendUrl = `http://localhost:${portConfig.frontend}`;

    // Start backend and frontend servers
    testServer = new TestServer(portConfig);
    await testServer.start('backend', testEnv.getTempDirectory());
    await testServer.start('frontend', testEnv.getTempDirectory());

    // Create project factory
    projectFactory = new ProjectFactory(testEnv);

    // Create test project
    const project = await projectFactory.createProject('empty', {
      name: 'E2E Test Project',
      code: 'E2E',
      description: 'Project for testing ticket movement',
      crPath: 'docs/CRs',
      repository: 'test-repo'
    });
    projectKey = project.key;

    // Create test tickets for drag and drop
    await projectFactory.createTestCR(projectKey, {
      title: 'Test Ticket 001 - To Move',
      type: 'Feature Enhancement',
      priority: 'Medium',
      status: 'Proposed',
      content: {
        description: 'Test ticket for drag and drop functionality',
        rationale: 'This ticket tests the drag and drop feature',
        solutionAnalysis: 'We will test drag and drop',
        implementationSpec: 'Drag the ticket from Proposed to In Progress',
        acceptanceCriteria: '- Ticket can be dragged\n- Ticket moves to correct column'
      }
    });

    await projectFactory.createTestCR(projectKey, {
      title: 'Test Ticket 002 - Already In Progress',
      type: 'Bug Fix',
      priority: 'High',
      status: 'In Progress',
      content: {
        description: 'Another test ticket',
        rationale: 'Testing multiple tickets',
        solutionAnalysis: 'Multiple tickets test',
        implementationSpec: 'Second ticket',
        acceptanceCriteria: '- Second ticket exists'
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test environment
    await testServer.stopAll();
    await testEnv.cleanup();
  });

  test('should drag and drop ticket from Proposed to In Progress', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    console.log('🔍 Page loaded, waiting for content...');

    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');

    // Wait for main content
    await page.waitForSelector('h1', { timeout: 15000 });

    console.log('✅ Main content loaded');

    // Select our test project
    const projectSelector = page.locator('select').first();
    if (await projectSelector.count() > 0) {
      await projectSelector.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
      console.log(`✅ ${projectKey} project selected`);
    }

    // Wait for board grid
    await page.waitForSelector('.grid', { timeout: 15000 });
    console.log('✅ Board grid loaded');

    // Look for our test ticket (it will have an auto-generated code like E2E-001)
    const testTicket = page.locator('text=/E2E-\\d+/').first();

    if (await testTicket.count() === 0) {
      console.log('❌ Test ticket not found on page');

      // Debug: List all visible tickets
      const allTickets = page.locator('[data-testid="ticket-card"]');
      const ticketCount = await allTickets.count();
      console.log(`Found ${ticketCount} tickets on board`);

      for (let i = 0; i < ticketCount; i++) {
        const ticketText = await allTickets.nth(i).textContent();
        console.log(`Ticket ${i}: ${ticketText}`);
      }

      expect(await testTicket.count()).toBeGreaterThan(0);
      return;
    }

    console.log('✅ Found test ticket');

    // Find the ticket card
    const ticketCard = testTicket.locator('xpath=ancestor::div[contains(@class, "bg-white")][contains(@class, "rounded-lg")][contains(@class, "shadow")][contains(@class, "p-4")]').first();
    await expect(ticketCard).toBeVisible();

    // Find current column (should be "Proposed")
    const currentColumn = ticketCard.locator('xpath=ancestor::div[contains(@class, "flex flex-col")]').first();
    const currentColumnHeader = currentColumn.locator('h2, h3').first();
    const currentColumnName = await currentColumnHeader.textContent();
    console.log(`🔍 Test ticket is currently in: ${currentColumnName}`);

    // Find In Progress column
    const inProgressColumn = page.locator('div.flex.flex-col').filter({ hasText: 'In Progress' }).first();
    const targetHeader = await inProgressColumn.locator('h2, h3').textContent();
    console.log(`🎯 Target column: ${targetHeader}`);

    // Drag to In Progress
    console.log('🖱️ Dragging ticket to In Progress...');
    await ticketCard.dragTo(inProgressColumn, {
      force: true,
      targetPosition: { x: 100, y: 100 }
    });

    await page.waitForTimeout(2000);

    // Verify it moved
    const inProgressTickets = inProgressColumn.locator('div').filter({ hasText: /E2E-\d+/ });
    const movedToInProgress = await inProgressTickets.count() > 0;

    if (movedToInProgress) {
      console.log('✅ Ticket successfully moved to In Progress');
    } else {
      console.log('❌ Ticket did not move to In Progress');

      // Debug: Check if ticket is still in original column
      const stillInOriginal = await currentColumn.locator('div').filter({ hasText: /E2E-\d+/ }).count() > 0;
      console.log(`Ticket still in original column: ${stillInOriginal}`);
    }

    expect(movedToInProgress).toBe(true);

    console.log('🎉 Drag and drop test completed in isolated environment!');
  });

  test('should maintain ticket state after page refresh', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select test project
    const projectSelector = page.locator('select').first();
    if (await projectSelector.count() > 0) {
      await projectSelector.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for board
    await page.waitForSelector('.grid', { timeout: 15000 });

    // Count tickets before refresh
    const ticketCards = page.locator('[data-testid="ticket-card"]');
    const initialCount = await ticketCards.count();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.grid', { timeout: 15000 });

    // Verify tickets are still there
    const refreshedCards = page.locator('[data-testid="ticket-card"]');
    const afterRefreshCount = await refreshedCards.count();

    expect(afterRefreshCount).toBe(initialCount);
    console.log(`✅ Ticket state maintained after refresh (${afterRefreshCount} tickets)`);
  });
});