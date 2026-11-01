import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '../fixtures/test-fixtures.js'
import { htmlSandboxSelectors } from '../utils/selectors.js'

test('styleguide runs production badge demos and styles in MDT preview', async ({ page, e2eContext }, testInfo) => {
  const project = await e2eContext.projectFactory.createProject('empty', {
    name: 'Styleguide preview',
    documentPaths: ['docs/site'],
  })
  const source = fileURLToPath(new URL('../../../frontend/src/', import.meta.url))
  const files = ['styleguide.html', 'styleguide/dist/externalReferences.js', 'styleguide/dist/externalReferences.css']
  for (const file of files) {
    const destination = join(project.path, 'docs/site', file)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(join(source, file), destination)
  }
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent('docs/site/styleguide.html')}`)
  const iframe = page.locator(htmlSandboxSelectors.iframe)
  await expect(iframe).toBeVisible()
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  const frame = iframe.contentFrame()
  const swatch = frame.locator('.sw').first()
  await expect(swatch.locator('.sw__val')).not.toHaveText('oklch()')
  await expect(swatch.locator('.sw__val')).toContainText(/oklch\(\S/)
  const chip = swatch.locator('.sw__chip')
  const light = await chip.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(light).not.toBe('rgba(0, 0, 0, 0)')
  const badge = frame.locator('.chips .badge').first()
  const metrics = await badge.evaluate(element => {
    const style = getComputedStyle(element)
    return { padding: style.padding, gap: style.gap, height: element.getBoundingClientRect().height }
  })
  expect(metrics).toEqual({ padding: '2px 6px', gap: '4px', height: 20 })
  await frame.getByRole('button', { name: /Toggle theme/ }).click()
  await expect.poll(() => chip.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(light)
  await expect(frame.locator('script[src$="externalReferences.tsx"]')).toHaveCount(0)
  expect(requests.some(url => url.includes('externalReferences.tsx'))).toBe(false)
  const grouped = frame.locator('[data-reference-demo="grouped"]')
  await expect(grouped.locator('[data-testid="external-reference-group"]')).toHaveCount(1)
  await expect(grouped).toContainText('95')
  await expect(grouped).toContainText('68')
  const jira = grouped.locator('img')
  await expect(jira).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect.poll(() => jira.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const unavailable = frame.getByRole('button', { name: 'Explain unavailable reference legacy:OPS-7' })
  await unavailable.click()
  const details = frame.locator('[data-testid="external-reference-details"]')
  await expect(details).toHaveText('Tracker instance is not configured')
  expect(await details.evaluate(element => element.closest('.badge'))).toBeNull()
  await page.keyboard.press('Escape')
  await expect(unavailable).toBeFocused()
  const overflow = frame.getByRole('button', { name: 'Show 2 more external references in work' })
  await overflow.click()
  await expect(details.locator('a')).toHaveText(['work:PRJ-126', 'work:PRJ-127'])
  await page.keyboard.press('Escape')
  await expect(overflow).toBeFocused()
  expect((await frame.locator('[data-reference-demo]').allTextContents()).join(' ')).not.toMatch(/Loading live badge|requires the Vite/)
  expect(requests.some(url => /styleguide\/dist\/externalReferences\.js$/.test(url))).toBe(true)
  await iframe.screenshot({ path: testInfo.outputPath('styleguide-mdt-preview.png') })
})
