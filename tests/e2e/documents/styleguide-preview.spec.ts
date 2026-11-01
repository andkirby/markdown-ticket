import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '../fixtures/test-fixtures.js'
import { htmlSandboxSelectors } from '../utils/selectors.js'

test('styleguide loads its real tokens and static badge styles in MDT preview', async ({ page, e2eContext }, testInfo) => {
  const project = await e2eContext.projectFactory.createProject('empty', {
    name: 'Styleguide preview',
    documentPaths: ['docs/site'],
  })
  const source = fileURLToPath(new URL('../../../frontend/src/', import.meta.url))
  const files = [
    'styleguide.html',
    'styles/design-tokens.css',
    'styles/components/tabs.css',
    'styles/components/checkbox.css',
    'components/Badge/badge.css',
    'components/TicketCard/ticket.css',
    'components/QuickSearch/quick-search.css',
  ]
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
  await expect(frame.locator('[data-reference-demo="grouped"]')).toContainText('requires the Vite dev server')
  await iframe.screenshot({ path: testInfo.outputPath('styleguide-mdt-preview.png') })
})
