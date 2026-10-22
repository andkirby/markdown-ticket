import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'

// Valid UI-shaped payloads through HTTP, persisted ingress, list/read and SSE.
test('MDT-258 create, read, update and delete retain board payload parity', async ({ page, e2eContext }) => {
  const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  await page.goto(`/prj/${scenario.projectCode}`)
  await expect(page.locator(boardSelectors.board)).toBeVisible()
  const api = `/api/projects/${scenario.projectCode}/crs`
  const created = await page.request.post(api, { data: { title: 'Boundary CRUD title', type: 'Bug Fix', description: 'Persisted ingress journey' } })
  expect(created.status()).toBe(201)
  const result = await created.json()
  const code = result.crCode
  expect(code).toMatch(/-\d+$/)
  const read = await page.request.get(`${api}/${code}`)
  expect(read.ok()).toBe(true)
  expect(await read.json()).toMatchObject({ code, title: 'Boundary CRUD title', priority: 'Medium' })
  await page.reload()
  await expect(page.locator(boardSelectors.ticketByCode(code))).toContainText('Boundary CRUD title')
  const updated = await page.request.patch(`${api}/${code}`, { data: { status: 'In Progress', priority: 'High' } })
  expect(updated.ok()).toBe(true)
  const reread = await page.request.get(`${api}/${code}`)
  expect(await reread.json()).toMatchObject({ code, status: 'In Progress', priority: 'High' })
  await page.reload()
  await expect(page.locator(boardSelectors.columnByStatus('In Progress')).locator(boardSelectors.ticketByCode(code))).toBeVisible()
  expect((await page.request.delete(`${api}/${code}`)).ok()).toBe(true)
  expect((await page.request.get(`${api}/${code}`)).status()).toBe(404)
})

test('MDT-258 API CRUD fallback covers create, persisted read, update and delete', async ({ request, e2eContext }) => {
  const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  const api = `${e2eContext.backendUrl}/api/projects/${scenario.projectCode}/crs`
  const created = await request.post(api, { data: { title: 'Boundary API title', type: 'Bug Fix', description: 'Persisted input journey' } })
  expect(created.status()).toBe(201)
  const result = await created.json()
  const code = result.crCode
  expect(code).toMatch(/-\d+$/)
  const read = await request.get(`${api}/${code}`)
  expect(await read.json()).toMatchObject({ code, title: 'Boundary API title', priority: 'Medium' })
  expect((await request.patch(`${api}/${code}`, { data: { status: 'In Progress', priority: 'High', dependsOn: ['ABC-001'] } })).ok()).toBe(true)
  const reread = await request.get(`${api}/${code}`)
  expect(await reread.json()).toMatchObject({ code, status: 'In Progress', priority: 'High', dependsOn: ['ABC-001'] })
  const list = await request.get(api)
  expect(await list.json()).toEqual(expect.arrayContaining([expect.objectContaining({ code, status: 'In Progress' })]))
  expect((await request.delete(`${api}/${code}`)).ok()).toBe(true)
  expect((await request.get(`${api}/${code}`)).status()).toBe(404)
})
