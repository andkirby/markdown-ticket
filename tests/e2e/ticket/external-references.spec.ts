import { execFile } from 'node:child_process'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from '../fixtures/test-fixtures.js'
import { createExternalReferenceProject } from '../setup/external-references.js'
import { boardSelectors, externalReferenceSelectors, quickSearchSelectors, projectSelectors, selectorSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('MDT-252 external references', () => {
  test('read-only visitors retain external links while ticket mutations are denied', async ({ request, browser, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const ticket = await fixture.ticket('Read-only external link', ['work:PRJ-123'])
    const sharing = await request.put(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/sharing`, { data: { mode: 'public-readonly' }, headers: { 'x-mdt-owner-intent': '1' } })
    expect(sharing.ok()).toBe(true)
    const context = await browser.newContext()
    try {
      await e2eContext.setRuntimeConfigOverride({ API_LOCAL_HOST_BYPASS: 'false' })
      const visitor = await context.newPage()
      await visitor.goto(`${e2eContext.frontendUrl}/prj/${fixture.project.key}`)
      const card = visitor.locator(boardSelectors.ticketByCode(ticket.code))
      await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', 'https://jira.example.test/jira/browse/PRJ-123')
      await expect(visitor.locator(boardSelectors.dragHandle)).toHaveCount(0)
      const denied = await context.request.patch(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`, { data: { refs: [] }, headers: { 'host': 'share.example.test', 'x-mdt-owner-intent': '1' } })
      expect([401, 403]).toContain(denied.status())
    }
    finally {
      await context.close()
      await e2eContext.clearRuntimeConfigOverride()
    }
  })

  test('CLI add/remove preserve existing shorthand and removal stays idempotent', async ({ request, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const original = ['gh:#42', 'gh:acme/widgets#42', 'legacy:OPS-7']
    const ticket = await fixture.ticket('Compose reference operands', original)
    const command = fileURLToPath(new URL('../../../cli/src/index.ts', import.meta.url))
    const run = (...attrs: string[]) => promisify(execFile)('bun', [command, 'ticket', 'attr', ticket.code, ...attrs], { cwd: fixture.project.path, env: process.env, timeout: 30000 })
    const api = `${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`
    const structured = await promisify(execFile)('bun', [command, 'ticket', 'get', ticket.code, '--json'], { cwd: fixture.project.path, env: process.env, timeout: 30000 })
    expect(JSON.parse(structured.stdout).data.ticket.refs).toEqual(original)
    await run('refs+=gl:#18', 'refs+=gl:#18')
    expect(await (await request.get(api)).json()).toMatchObject({ refs: [...original, 'gl:acme/platform/api#18'] })
    await run('refs-=gh:#42')
    await run('refs-=gh:#42')
    expect(await (await request.get(api)).json()).toMatchObject({ refs: ['gh:acme/widgets#42', 'legacy:OPS-7', 'gl:acme/platform/api#18'] })
  })

  test('stored refs survive API reads, metadata and unrelated edits', async ({ request, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const refs = ['work:PRJ-123', 'gh:acme/widgets#123', 'legacy:raw_value,with punctuation']
    const ticket = await fixture.ticket('Preserved external identities', refs)
    const api = `${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs`
    expect(await (await request.get(`${api}/${ticket.code}`)).json()).toMatchObject({ code: ticket.code, refs })
    expect((await request.patch(`${api}/${ticket.code}`, { data: { priority: 'High' } })).ok()).toBe(true)
    expect(await (await request.get(`${api}/${ticket.code}`)).json()).toMatchObject({ refs, priority: 'High' })
    expect(await (await request.get(api)).json()).toEqual(expect.arrayContaining([expect.objectContaining({ code: ticket.code, refs })]))
    expect(await readFile(ticket.path, 'utf8')).toContain(JSON.stringify(refs))
  })

  test('API creation, explicit replacement and clearing keep local identity', async ({ request, e2eContext }) => {
    const { project } = await createExternalReferenceProject(e2eContext)
    const api = `${e2eContext.backendUrl}/api/projects/${project.key}/crs`
    const created = await request.post(api, { data: { title: 'Explicit reference creation', type: 'Bug Fix', refs: ['gh:#42', 'work:PRJ-123'] } })
    expect(created.status()).toBe(201)
    const { crCode } = await created.json()
    expect(await (await request.get(`${api}/${crCode}`)).json()).toMatchObject({ code: crCode, refs: ['gh:acme/widgets#42', 'work:PRJ-123'] })
    for (const refs of [['legacy:OPS-7'], []]) {
      expect((await request.patch(`${api}/${crCode}`, { data: { refs } })).ok()).toBe(true)
      expect(await (await request.get(`${api}/${crCode}`)).json()).toMatchObject({ code: crCode, refs })
    }
  })

  test('badge links use configured instance URLs, shorten labels and isolate the card', async ({ page, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const ticket = await fixture.ticket('Recognize external issue', ['work:PRJ-123', 'gh:acme/widgets#42'])
    await page.goto(`/prj/${fixture.project.key}`)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    const jira = card.locator(externalReferenceSelectors.link).filter({ hasText: '123' })
    await expect(jira).toHaveAttribute('href', 'https://jira.example.test/jira/browse/PRJ-123')
    await expect(jira).toHaveAttribute('target', '_blank')
    await expect(jira).not.toContainText('PRJ-')
    await expect(card.locator(externalReferenceSelectors.link).filter({ hasText: 'widgets#42' })).toBeVisible()
    await expect(card.locator(externalReferenceSelectors.detailsTrigger)).toHaveCount(0)
    await page.context().route('https://jira.example.test/**', route => route.fulfill({ body: '<h1>External issue</h1>', contentType: 'text/html' }))
    const popup = page.waitForEvent('popup')
    await jira.click()
    await (await popup).close()
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()
  })

  test('groups short keys by instance and lists only hidden refs in overflow', async ({ page, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    await appendFile(join(fixture.project.path, '.mdt-config.toml'), '\n[trackers.client]\nkind = "jira"\nbaseUrl = "https://client.example.test"\nprojectKeys = ["PRJ"]\n')
    const ticket = await fixture.ticket('Grouped external references', ['work:PRJ-123', 'client:PRJ-123', 'work:PRJ-124', 'work:PRJ-125', 'work:PRJ-126', 'work:PRJ-127', 'gh:acme/widgets#42'])
    await page.goto(`/prj/${fixture.project.key}`)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    await expect(card.locator(externalReferenceSelectors.group)).toHaveCount(3)
    const group = card.getByRole('group', { name: 'jira references (work)', exact: true })
    await expect(group.locator('.external-reference__icon')).toHaveCount(1)
    await expect(group).toContainText('work:')
    await expect(group.locator(externalReferenceSelectors.link)).toHaveText(['123', '124', '125'])
    const client = card.getByRole('group', { name: 'jira references (client)', exact: true })
    await expect(client).toContainText('client:')
    await expect(client.locator(externalReferenceSelectors.detailsTrigger)).toHaveCount(0)
    const trigger = group.locator(externalReferenceSelectors.detailsTrigger)
    await expect(trigger).toHaveText('+2')
    await trigger.click()
    const details = page.locator(externalReferenceSelectors.details)
    const hidden = details.locator(externalReferenceSelectors.link)
    await expect(hidden).toHaveText(['126', '127'])
    await expect(hidden.first()).toHaveAttribute('href', 'https://jira.example.test/jira/browse/PRJ-126')
    await expect(hidden.first()).toHaveAttribute('title', /work:PRJ-126/)
    await expect(hidden.first()).toHaveAttribute('aria-label', /PRJ-126.*new tab/)
    await expect(hidden.first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()
  })

  test('details reveal full unavailable refs and restore keyboard focus', async ({ page, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const ticket = await fixture.ticket('Inspect unknown reference', ['legacy:OPS-7'])
    await page.goto(`/prj/${fixture.project.key}`)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    await expect(card.locator(externalReferenceSelectors.unavailable)).toContainText('legacy:OPS-7')
    await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(0)
    const trigger = card.locator(externalReferenceSelectors.detailsTrigger)
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator(externalReferenceSelectors.details)).toContainText('legacy:OPS-7')
    await expect(page.locator(externalReferenceSelectors.details)).toContainText(/not configured|unavailable/i)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()
  })

  test('URLs preserve subgroup/context paths and unsafe or unsupported configuration stays unavailable', async ({ request, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    await appendFile(join(fixture.project.path, '.mdt-config.toml'), `
[trackers.unsafe]
kind = "jira"
baseUrl = "https://jira.example.test"
urlTemplate = "https://different.example.test/{key}"
[trackers.broken]
kind = "future-provider"
baseUrl = false
`)
    const refs = ['gl:acme/platform/api#18', 'work:PRJ_2-12345', 'unsafe:PRJ-123', 'broken:OPS-7', 'gh:#42', 'gl:acme/platform/api!18']
    const ticket = await fixture.ticket('Unavailable optional config', refs)
    const api = `${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`
    const response = await request.get(api)
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.refs).toEqual(refs)
    expect(body.externalRefs[0].url).toBe('https://gitlab.example.test/context/acme/platform/api/-/issues/18')
    expect(body.externalRefs[1].url).toBe('https://jira.example.test/jira/browse/PRJ_2-12345')
    for (const reference of body.externalRefs.slice(2)) {
      expect(reference.url).toBeUndefined()
      expect(reference.unavailableReason).toEqual(expect.any(String))
    }
  })

  test('viewer refs remain available when board references are hidden', async ({ page, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const ticket = await fixture.ticket('Viewer external identity', ['work:PRJ-123'])
    await page.addInitScript(() => {
      localStorage.setItem('markdown-ticket:board:ticket-card-badges:v2', JSON.stringify(['status', 'type']))
      localStorage.setItem('markdown-ticket:external-references-preference-migrated', 'true')
    })
    await page.goto(`/prj/${fixture.project.key}`)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    await expect(card).toBeVisible()
    await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(0)
    await card.click()
    await expect(page.locator(ticketSelectors.detailPanel).locator(externalReferenceSelectors.link)).toHaveAttribute('href', 'https://jira.example.test/jira/browse/PRJ-123')
  })

  test('narrow grouped badges bound long labels and hidden-only overflow', async ({ page, request, e2eContext }) => {
    const fixture = await createExternalReferenceProject(e2eContext)
    const repository = 'a-very-long-repository-name-for-reference-layout-validation'
    const refs = ['work:PRJ-123', ...[42, 43, 44, 45, 46].map(number => `gh:acme/${repository}#${number}`), 'gh:#42']
    const ticket = await fixture.ticket('Overflowing reference list', refs)
    expect((await request.patch(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`, { data: { status: 'Proposed' } })).ok()).toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/prj/${fixture.project.key}`)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(4)
    const trigger = card.locator(externalReferenceSelectors.detailsTrigger)
    await expect(trigger).toHaveText('+3')
    await trigger.click()
    const details = page.locator(externalReferenceSelectors.details)
    await expect(details.locator(externalReferenceSelectors.link)).toHaveText([`${repository}#45`, `${repository}#46`])
    await expect(details.locator(externalReferenceSelectors.unavailable)).toHaveText('gh:#42')
    await expect(details).toContainText('explicit replacement')
    await expect(card).toBeInViewport()
    const bounds = await details.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
    expect(bounds!.height).toBeLessThanOrEqual(844)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
})

test('MDT-252 preference migration preserves selections and subsequent opt-out', async ({ page, e2eContext }) => {
  const fixture = await createExternalReferenceProject(e2eContext)
  const ticket = await fixture.ticket('Saved selection migration', ['work:PRJ-123'])
  await page.addInitScript(() => {
    if (!localStorage.getItem('mdt252-seeded')) {
      localStorage.setItem('markdown-ticket:board:ticket-card-badges:v2', JSON.stringify(['status', 'related']))
      localStorage.setItem('mdt252-seeded', 'true')
    }
  })
  await page.goto(`/prj/${fixture.project.key}`)
  const card = page.locator(boardSelectors.ticketByCode(ticket.code))
  await expect(card.locator(externalReferenceSelectors.link)).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('markdown-ticket:board:ticket-card-badges:v2')!))).toEqual(['status', 'related', 'externalRefs'])
  await page.evaluate(() => localStorage.setItem('markdown-ticket:board:ticket-card-badges:v2', JSON.stringify(['status', 'related'])))
  await page.reload()
  await expect(card).toBeVisible()
  await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(0)
})

test('MDT-252 compact/light and comfortable/dark retain targets, contrast and chrome type', async ({ page, e2eContext }, testInfo) => {
  const fixture = await createExternalReferenceProject(e2eContext)
  const ticket = await fixture.ticket('Reference appearance verification', ['work:PRJ-123', 'gh:acme/widgets#42', 'legacy:OPS-7'])
  let panelFont: number | undefined
  for (const [size, space, theme] of [['compact', 'tight', 'light'], ['comfortable', 'relaxed', 'dark']]) {
    await page.addInitScript(({ size, space, theme }) => {
      localStorage.setItem('mdt-settings-card-density', size)
      localStorage.setItem('mdt-settings-space-density', space)
      document.cookie = `theme=${theme}; path=/`
    }, { size, space, theme })
    await page.goto(`/prj/${fixture.project.key}`)
    if (theme === 'dark')
      await expect(page.locator('html')).toHaveClass(/dark/)
    else
      await expect(page.locator('html')).not.toHaveClass(/dark/)
    const card = page.locator(boardSelectors.ticketByCode(ticket.code))
    const link = card.locator(externalReferenceSelectors.link).first()
    await expect(link).toBeVisible()
    const style = await link.evaluate(element => {
      const rect = element.getBoundingClientRect()
      const computed = getComputedStyle(element)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      const luminance = (color: string) => {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      }
      const text = luminance(computed.color)
      const background = luminance(getComputedStyle(element.closest('[data-external-reference]')!).backgroundColor)
      return { width: rect.width, height: rect.height, font: Number.parseFloat(computed.fontSize), contrast: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05) }
    })
    expect(style.width).toBeGreaterThanOrEqual(24)
    expect(style.height).toBeGreaterThanOrEqual(24)
    expect(style.font).toBeGreaterThanOrEqual(11)
    expect(style.contrast).toBeGreaterThanOrEqual(4.5)
    await card.screenshot({ path: testInfo.outputPath(`external-reference-${theme}-${size}.png`) })
    const trigger = card.locator(externalReferenceSelectors.detailsTrigger)
    await trigger.click()
    const font = await page.locator(externalReferenceSelectors.details).evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))
    if (panelFont !== undefined)
      expect(font).toBe(panelFont)
    panelFont = font
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await card.click()
    const viewer = page.locator(ticketSelectors.detailPanel)
    const viewerTrigger = viewer.locator(externalReferenceSelectors.detailsTrigger)
    await viewerTrigger.click()
    await page.keyboard.press('Escape')
    await expect(viewer).toBeVisible()
    await expect(viewerTrigger).toBeFocused()
  }
})

test('MDT-252 invalid optional tracker entries survive unrelated project updates', async ({ request, e2eContext }) => {
  const fixture = await createExternalReferenceProject(e2eContext)
  const configPath = join(fixture.project.path, '.mdt-config.toml')
  await appendFile(configPath, '\n[trackers.future]\nkind = "unsupported"\nbaseUrl = 123\n')
  const ticket = await fixture.ticket('Project remains available', ['future:OPS-7'])
  expect((await request.put(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/update`, { data: { description: 'Unrelated edit' } })).ok()).toBe(true)
  const config = await readFile(configPath, 'utf8')
  expect(config).toContain('unsupported')
  expect(config).toContain('baseUrl = 123')
  const response = await request.get(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`)
  expect(response.ok()).toBe(true)
  expect(await response.json()).toMatchObject({ refs: ['future:OPS-7'], externalRefs: [expect.objectContaining({ unavailableReason: expect.any(String) })] })
})


test('MDT-252 style guide renders agreed badge flow in both themes', async ({ page }, testInfo) => {
  await page.goto(new URL('../../../frontend/src/styleguide.html#external-reference-badges', import.meta.url).href)
  const section = page.locator('.external-reference-demo')
  await expect(section.locator('.ticket-card')).toHaveCount(3)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
    await section.screenshot({ path: testInfo.outputPath(`styleguide-external-${theme}.png`) })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const details = section.locator('details').last()
  await details.locator('summary').click()
  await expect(details.locator('.external-reference__link')).toHaveText(['126', '127'])
  await expect(details.locator('.external-reference__link').first()).toHaveAttribute('title', /work:PRJ-126/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})


test('MDT-252 live absent/add/replace/clear updates board, search and viewer without reload', async ({ page, request, e2eContext }) => {
  const fixture = await createExternalReferenceProject(e2eContext)
  const issue = String(Number.parseInt(fixture.project.key, 36))
  const jiraRef = `work:PRJ-${issue}`
  const ticket = await fixture.ticket('Live reference boundary', [])
  await writeFile(ticket.path, (await readFile(ticket.path, 'utf8')).replace(/^refs:.*\r?\n/m, ''))
  await page.goto(`/prj/${fixture.project.key}`)
  const card = page.locator(boardSelectors.ticketByCode(ticket.code))
  await expect(card).toBeVisible()
  await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(0)
  const api = `${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`
  expect((await request.patch(api, { data: { refs: [jiraRef] } })).ok()).toBe(true)
  await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://jira.example.test/jira/browse/PRJ-${issue}`)
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+k`)
  await page.locator(quickSearchSelectors.input).fill(jiraRef)
  await expect(page.locator(quickSearchSelectors.results).locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://jira.example.test/jira/browse/PRJ-${issue}`)
  await page.keyboard.press('Escape')
  await card.click()
  const viewer = page.locator(ticketSelectors.detailPanel)
  await expect(viewer.locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://jira.example.test/jira/browse/PRJ-${issue}`)
  expect((await request.patch(api, { data: { refs: [`gh:acme/widgets#${issue}`] } })).ok()).toBe(true)
  await expect(viewer.locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://github.example.test/acme/widgets/issues/${issue}`)
  await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://github.example.test/acme/widgets/issues/${issue}`)
  await page.keyboard.press('Escape')
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+k`)
  await page.locator(quickSearchSelectors.input).fill(jiraRef)
  await expect(page.locator(quickSearchSelectors.noResults)).toBeVisible()
  await page.locator(quickSearchSelectors.input).fill(`#${issue}`)
  const results = page.locator(quickSearchSelectors.results)
  await expect(results.locator(externalReferenceSelectors.link)).toHaveAttribute('href', `https://github.example.test/acme/widgets/issues/${issue}`)
  expect((await request.patch(api, { data: { refs: [] } })).ok()).toBe(true)
  await expect(results.locator(externalReferenceSelectors.link)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(card.locator(externalReferenceSelectors.link)).toHaveCount(0)
  await expect(card.locator(externalReferenceSelectors.detailsTrigger)).toHaveCount(0)
})


test('MDT-252 invalidation cannot reuse an in-flight pre-mutation search response', async ({ page, request, e2eContext }) => {
  const fixture = await createExternalReferenceProject(e2eContext)
  const issue = String(Number.parseInt(fixture.project.key, 36))
  const jiraRef = `work:PRJ-${issue}`
  const ticket = await fixture.ticket('Delayed search identity', [jiraRef])
  await page.goto(`/prj/${fixture.project.key}`)
  await expect(page.locator(boardSelectors.ticketByCode(ticket.code))).toBeVisible()
  let held = false
  let calls = 0
  let release = () => {}
  const released = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/projects/search', async (route) => {
    if (route.request().postDataJSON()?.query !== jiraRef || ++calls !== 1) {
      await route.continue()
      return
    }
    const response = await route.fetch()
    const body = await response.text()
    held = true
    await released
    await route.fulfill({ status: response.status(), contentType: 'application/json', body, headers: { 'x-mdt252-held': 'search' } }).catch(() => {})
  })
  try {
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+k`)
    await page.locator(quickSearchSelectors.input).fill(jiraRef)
    await expect.poll(() => held).toBe(true)
    expect((await request.patch(`${e2eContext.backendUrl}/api/projects/${fixture.project.key}/crs/${ticket.code}`, { data: { refs: [`gh:acme/widgets#${issue}`] } })).ok()).toBe(true)
    await expect.poll(() => calls).toBeGreaterThan(1)
    await expect(page.locator(quickSearchSelectors.noResults)).toBeVisible()
    const oldResponse = page.waitForResponse(response => response.headers()['x-mdt252-held'] === 'search')
    release()
    await (await oldResponse).finished()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(page.locator(quickSearchSelectors.noResults)).toBeVisible()
    await expect(page.locator(quickSearchSelectors.results).locator(externalReferenceSelectors.link)).toHaveCount(0)
  }
  finally {
    release()
  }
})

test('MDT-252 delayed canonical refs cannot overwrite a newer A to B to A selection', async ({ page, request, e2eContext }) => {
  const first = await createExternalReferenceProject(e2eContext)
  const ticket = await first.ticket('Selection generation reference', ['work:PRJ-123'])
  const second = await createExternalReferenceProject(e2eContext)
  const other = await second.ticket('Selection generation other project', [])
  await page.goto(`/prj/${first.project.key}`)
  const card = page.locator(boardSelectors.ticketByCode(ticket.code))
  await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', 'https://jira.example.test/jira/browse/PRJ-123')
  let held = false
  let release = () => {}
  const released = new Promise<void>((resolve) => { release = resolve })
  await page.route(`**/api/projects/*/crs/${ticket.code}`, async (route) => {
    if (route.request().method() !== 'GET' || held) {
      await route.continue()
      return
    }
    const response = await route.fetch()
    const body = await response.text()
    held = true
    await released
    await route.fulfill({ status: response.status(), contentType: 'application/json', body, headers: { 'x-mdt252-held': 'ticket' } }).catch(() => {})
  })
  const select = async (code: string) => {
    await page.locator(selectorSelectors.panelTrigger).click()
    await page.locator(projectSelectors.projectOption(code)).click()
  }
  try {
    const api = `${e2eContext.backendUrl}/api/projects/${first.project.key}/crs/${ticket.code}`
    expect((await request.patch(api, { data: { priority: 'High' } })).ok()).toBe(true)
    await expect.poll(() => held).toBe(true)
    await select(second.project.key)
    await expect(page.locator(boardSelectors.ticketByCode(other.code))).toBeVisible()
    expect((await request.patch(api, { data: { refs: ['gh:acme/widgets#456'] } })).ok()).toBe(true)
    await select(first.project.key)
    await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', 'https://github.example.test/acme/widgets/issues/456')
    const oldResponse = page.waitForResponse(response => response.headers()['x-mdt252-held'] === 'ticket')
    release()
    await (await oldResponse).finished()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(card.locator(externalReferenceSelectors.link)).toHaveAttribute('href', 'https://github.example.test/acme/widgets/issues/456')
  }
  finally {
    release()
  }
})
