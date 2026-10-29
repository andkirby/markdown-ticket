import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import * as contracts from '@mdt/domain-contracts'
import express from 'express'
import request from 'supertest'
import ts from 'typescript'
import * as parser from '../../http/parseRequest'
import * as readSchemas from '../../http/readSchemas'
import * as origins from '../../security/originPolicy'

// The production module has no DEV-mode activator. Exercise its actual dormant
// handler in an isolated compiled module with a test-only state setter appended;
// no production activation endpoint or exported testing API is introduced.
function activeDevApp() {
  const source = readFileSync(join(__dirname, '../../modules/system/devtools.ts'), 'utf8')
  const compiled = ts.transpileModule(`${source}\nexport function activateForTest() { devModeActive = true; devModeStart = Date.now() }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports: { createDevToolsRouter?: () => express.Router, activateForTest?: () => void } = {}
  const imports: Record<string, unknown> = {
    '@mdt/domain-contracts': contracts,
    'express': express,
    '../../http/parseRequest.js': parser,
    '../../http/readSchemas.js': readSchemas,
    '../../security/originPolicy.js': origins,
  }
  runInNewContext(compiled, {
    exports,
    console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    require: (name: string) => {
      if (!(name in imports))
        throw new Error(`Unexpected fixture import: ${name}`)
      return imports[name]
    },
  })
  exports.activateForTest!()
  const app = express()
  app.use(express.json({ strict: false }))
  app.use(exports.createDevToolsRouter!())
  return app
}

describe('MDT-258 active DEV log handler', () => {
  const entry = { timestamp: 1, level: 'custom', message: 'active-mode-fixture', extra: true }
  it('rejects malformed whole batches without changing either buffer or rate count', async () => {
    const app = activeDevApp()
    for (const bad of [null, {}, 'bad', { ...entry, timestamp: 'wrong' }, { ...entry, line: [] }]) {
      const response = await request(app).post('/frontend/dev-logs').send({ logs: [entry, bad] })
      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', issues: expect.any(Array) })
      expect((await request(app).get('/frontend/dev-logs')).body).toMatchObject({ logs: [], total: 0 })
      expect((await request(app).get('/frontend/dev-logs/status')).body.rateLimit.current).toBe(0)
    }
    expect((await request(app).post('/frontend/dev-logs').send({ logs: [] })).body.received).toBe(0)
    expect((await request(app).post('/frontend/dev-logs').send({ logs: [entry] })).body.received).toBe(1)
    expect((await request(app).get('/frontend/dev-logs')).body.logs).toEqual([entry])
  })
  it('preserves the existing rate gate before shape handling', async () => {
    const app = activeDevApp()
    expect((await request(app).post('/frontend/dev-logs').send({ logs: Array.from({ length: 300 }, () => entry) })).status).toBe(200)
    const response = await request(app).post('/frontend/dev-logs').send({ logs: [null] })
    expect(response.status).toBe(429)
    expect(response.body.code).toBeUndefined()
    expect((await request(app).get('/frontend/dev-logs')).body.total).toBe(300)
  })
})
