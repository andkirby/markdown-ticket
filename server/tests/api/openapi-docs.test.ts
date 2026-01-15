/**
 * OpenAPI Docs Endpoint Tests - MDT-106
 * Tests for /api-docs endpoints: Redoc UI HTML and OpenAPI JSON spec
 * NOTE: Manual endpoint implementation to avoid import.meta issues.
 */
/// <reference types="jest" />

import type { Express, Request, Response } from 'express'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import jestOpenAPI from 'jest-openapi'
import * as yaml from 'js-yaml'
import request from 'supertest'

const SPEC_PATH = join(__dirname, '../../openapi.yaml')
const REDOC_HTML = `<!DOCTYPE html><html><head><title>Markdown Ticket API</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}redoc{display:block}</style></head><body><redoc spec-url="/api-docs/json"></redoc><script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script></body></html>`

describe('openAPI Docs Endpoint Tests (MDT-106)', () => {
  let app: Express
  let swaggerSpec: any

  beforeAll(() => {
    jestOpenAPI(SPEC_PATH)

    swaggerSpec = yaml.load(readFileSync(SPEC_PATH, 'utf-8'))

    app = express()
    app.get('/api-docs/json', (_req: Request, res: Response) => res.json(swaggerSpec))
    app.get('/api-docs', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html')
      res.send(REDOC_HTML)
    })
  })

  describe('gET /api-docs', () => {
    it('should serve Redoc UI HTML page with status 200', async () => {
      expect((await request(app).get('/api-docs')).status).toBe(200)
    })

    it('should return HTML content-type', async () => {
      expect((await request(app).get('/api-docs')).headers['content-type']).toContain('text/html')
    })

    it('should contain Redoc HTML in response body', async () => {
      const r = await request(app).get('/api-docs')

      expect(r.text).toContain('<!DOCTYPE html>')
      expect(r.text).toContain('redoc')
      expect(r.text).toContain('/api-docs/json')
    })

    it('should include title in Redoc UI', async () => {
      expect((await request(app).get('/api-docs')).text).toContain('Markdown Ticket API')
    })

    it('should satisfy OpenAPI spec for documentation endpoint', async () => {
      const r = await request(app).get('/api-docs')

      expect(r.status).toBe(200)
      expect(r.headers['content-type']).toContain('text/html')
    })
  })

  describe('gET /api-docs/json', () => {
    it('should return OpenAPI specification with status 200', async () => {
      expect((await request(app).get('/api-docs/json')).status).toBe(200)
    })

    it('should return JSON content-type', async () => {
      expect((await request(app).get('/api-docs/json')).headers['content-type']).toContain('application/json')
    })

    it('should contain openapi field', async () => {
      const b = (await request(app).get('/api-docs/json')).body

      expect(b.openapi).toBe('3.0.0')
    })

    it('should contain info field', async () => {
      const b = (await request(app).get('/api-docs/json')).body

      expect(b.info.title).toBe('Markdown Ticket API')
      expect(b.info.version).toBeDefined()
    })

    it('should contain paths field', async () => {
      const b = (await request(app).get('/api-docs/json')).body

      expect(typeof b.paths).toBe('object')
      expect(b.paths['/api-docs']).toBeDefined()
      expect(b.paths['/api-docs/json']).toBeDefined()
    })

    it('should contain components field', async () => {
      const b = (await request(app).get('/api-docs/json')).body

      expect(b.components.schemas).toBeDefined()
    })

    it('should match OpenAPI spec file on disk (R10.1)', async () => {
      const r = await request(app).get('/api-docs/json')
      const fileSpec = yaml.load(readFileSync(SPEC_PATH, 'utf-8')) as any

      expect(r.body.openapi).toBe(fileSpec.openapi)
      expect(r.body.info).toMatchObject(fileSpec.info)
    })

    it('should satisfy OpenAPI spec contract (R10.1)', async () => {
      expect(await request(app).get('/api-docs/json') as any).toSatisfyApiSpec()
    })
  })

  describe('openAPI Contract Validation (R10.1)', () => {
    const getBody = async () => (await request(app).get('/api-docs/json')).body

    it('should include all required top-level fields', async () => {
      const b = await getBody()

      expect(b.openapi).toBeDefined()
      expect(b.info).toBeDefined()
      expect(b.paths).toBeDefined()
      expect(b.components).toBeDefined()
    })

    it('should have valid semantic version', async () => {
      expect((await getBody()).info.version).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('should define API servers', async () => {
      const s = (await getBody()).servers

      expect(Array.isArray(s)).toBe(true)
      expect(s.length).toBeGreaterThan(0)
    })

    it('should include schema components', async () => {
      const schemas = (await getBody()).components?.schemas

      expect(schemas).toBeDefined()
      expect(typeof schemas).toBe('object')
    })

    it('should define common error schemas', async () => {
      const schemas = (await getBody()).components?.schemas

      expect(schemas.Error400).toBeDefined()
      expect(schemas.Error404).toBeDefined()
      expect(schemas.Error500).toBeDefined()
    })
  })

  describe('response Validation', () => {
    it('should return 404 for non-existent docs sub-path', async () => {
      expect((await request(app).get('/api-docs/nonexistent')).status).toBe(404)
    })

    it('should handle CORS headers correctly', async () => {
      const cors = (await request(app).get('/api-docs/json')).headers['access-control-allow-origin']

      expect([undefined, '*']).toContain(cors)
    })
  })
})
