/// <reference types="jest" />
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createConfigRouter } from '../../routes/config'

/**
 * Thin routes/controllers test (MDT-168 C-7): config routes/controllers are
 * transport-only delegates. No direct filesystem or parseToml logic appears in
 * the route or controller modules. Covers TEST-thin-routes-controllers.
 */
describe('config routes/controllers are transport-only', () => {
  it('routes/config.ts contains no direct filesystem reads or parseToml calls', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../routes/config.ts'), 'utf8')
    // routes may import adapters, but must not inline fs.readFile or parseToml
    expect(source).not.toMatch(/fs\.readFile/)
    expect(source).not.toMatch(/fs\.writeFile/)
    expect(source).not.toMatch(/parseToml/)
    expect(source).not.toMatch(/writeFileAtomic/)
  })

  it('controllers/ConfigController.ts contains no direct filesystem or TOML writes', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../controllers/ConfigController.ts'), 'utf8')
    expect(source).not.toMatch(/fs\.readFile/)
    expect(source).not.toMatch(/fs\.writeFile/)
    expect(source).not.toMatch(/parseToml/)
    expect(source).not.toMatch(/writeFileAtomic/)
    expect(source).not.toMatch(/stringify\(/)
  })

  it('createConfigRouter returns an Express router with selectors + patch routes', () => {
    interface RouterLayer { route?: { path: string, methods: Record<string, boolean> } }
    interface RouterShape { stack: RouterLayer[] }
    const router = createConfigRouter() as unknown as RouterShape
    // Flatten the router stack to find registered routes
    const routes: string[] = []
    for (const layer of router.stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase()
        routes.push(`${methods} ${layer.route.path}`)
      }
    }
    expect(routes.some(r => r.includes('GET') && r.includes('/selectors'))).toBe(true)
    expect(routes.some(r => r.includes('PATCH'))).toBe(true)
  })

  it('ConfigController delegates to ConfigApplicationService (does not own persistence)', () => {
    // The controller constructor takes only deps with an adapterResolver; it has
    // no file/TOML dependencies of its own.
    const source = fs.readFileSync(path.resolve(__dirname, '../../controllers/ConfigController.ts'), 'utf8')
    expect(source).toMatch(/ConfigApplicationService/)
    expect(source).toMatch(/transport-only|transport delegate|delegates/i)
  })
})
