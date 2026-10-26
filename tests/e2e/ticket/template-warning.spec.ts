import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'

test('MDT-261 browser creation consumer shows shared unfinished-body feedback and one created ticket', async ({ page, e2eContext }) => {
  const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  await page.goto(`/prj/${scenario.projectCode}`)
  await expect(page.locator(boardSelectors.board)).toBeVisible()
  // The routed board hides its legacy header/Create control. Exercise the
  // actual browser data consumer without introducing a new product entry point.
  const ticket = await page.evaluate(async (projectCode) => {
    const modulePath = '/src/services/dataLayer.ts'
    const { dataLayer } = await import(modulePath)
    return dataLayer.createTicket(projectCode, { title: 'New Change Request', type: 'Feature Enhancement' })
  }, scenario.projectCode)
  const warning = page.getByText(`Ticket ${ticket.code} was created with template placeholders.`, { exact: false })
  await expect(warning).toBeVisible()
  await expect(page.locator(boardSelectors.ticketByCode(ticket.code))).toHaveCount(1)
  await expect(page.locator(boardSelectors.ticketByCode(ticket.code))).toContainText('New Change Request')
  await page.getByRole('button', { name: 'Close toast', exact: true }).click()
  await expect(warning).not.toBeVisible()
  const read = await page.request.get(`/api/projects/${scenario.projectCode}/crs/${ticket.code}`)
  expect(read.ok()).toBe(true)
  expect(await read.json()).not.toHaveProperty('diagnostics')
})
