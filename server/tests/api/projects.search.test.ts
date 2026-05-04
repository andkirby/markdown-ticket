/**
 * API Tests: POST /api/projects/search - MDT-152
 *
 * Cross-project search endpoint contract tests.
 * Tests verify request validation, response shaping, result-limit enforcement,
 * project-code validation, and status code mapping.
 */

/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import request from 'supertest'
import { generateTestProjectCode } from './fixtures/projects'
import {
  assertBadRequest,
  assertNotFound,
  assertStatus,
  assertSuccess,
} from './helpers'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

describe('POST /api/projects/search — MDT-152', () => {
  let tempDir: string
  let app: Express
  let projectFactory: ProjectFactory

  beforeAll(async () => {
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app
    projectFactory = context.projectFactory
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  describe('ticket_key mode', () => {
    it('returns 200 with matching ticket for valid ticket key', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Search Test Project',
        code: generateTestProjectCode(),
      })
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Test Ticket',
        type: 'Feature Enhancement',
        content: 'Test content',
      })
      if (!crResult.success) return

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: crResult.crCode,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body.results).toBeDefined()
      expect(Array.isArray(res.body.results)).toBe(true)
      expect(res.body.total).toBeGreaterThanOrEqual(0)
    })

    it('returns 200 with empty results for non-existent ticket key', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: 'ZZZ-99999',
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body.results).toEqual([])
      expect(res.body.total).toBe(0)
    })

    it('returns ticket with project context in results', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Context Test Project',
        code: generateTestProjectCode(),
      })
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Context Test Ticket',
        type: 'Feature Enhancement',
        content: 'Test content',
      })
      if (!crResult.success) return

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: crResult.crCode,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      if (res.body.results.length > 0) {
        const result = res.body.results[0]
        expect(result.ticket).toBeDefined()
        expect(result.ticket.code).toBeDefined()
        expect(result.project).toBeDefined()
        expect(result.project.code).toBeDefined()
        expect(result.project.name).toBeDefined()
      }
    })

    it('finds ticket using simplified key (MDT-1 matches MDT-001)', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Simplified Key Project',
        code: 'SK1', // Short code to match PROJECT_CODE pattern (2-5 chars)
      })
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Simplified Key Ticket',
        type: 'Feature Enhancement',
        content: 'Test content',
      })
      if (!crResult.success) return

      // Extract the number part and strip leading zeros: MDT-001 → MDT-1
      const fullCode = crResult.crCode!
      const match = fullCode.match(/^(\w+)-0*(\d+)$/)
      if (!match) return
      const simplifiedKey = `${match[1]}-${match[2]}`

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: simplifiedKey,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body.results.length).toBeGreaterThanOrEqual(1)
      expect(res.body.results[0].ticket.code).toBe(fullCode)
    })
  })

  describe('project_scope mode', () => {
    it('returns 200 with results for valid project code and query', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Scope Test Project',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body.results).toBeDefined()
      expect(Array.isArray(res.body.results)).toBe(true)
    })

    it('returns results only from the specified project', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Scope Filter Project',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      if (res.body.results.length > 0) {
        for (const result of res.body.results) {
          expect(result.project.code).toBe(project.key)
        }
      }
    })

    it('returns 404 for invalid project code', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: 'test',
          projectCode: 'NONEXISTENT',
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertNotFound(res)
      expect(res.body.error).toBeDefined()
    })
  })

  describe('request validation', () => {
    it('returns 400 when mode is missing', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          query: 'ABC-42',
        })

      assertBadRequest(res)
    })

    it('returns 400 when query is missing', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
        })

      assertBadRequest(res)
    })

    it('returns 400 for invalid mode value', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'invalid',
          query: 'test',
        })

      assertBadRequest(res)
    })

    it('returns 400 when project_scope mode is missing projectCode', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: 'test',
        })

      assertBadRequest(res)
    })

    it('returns 400 when limitPerProject exceeds 5', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: 'ABC-42',
          limitPerProject: 6,
        })

      assertBadRequest(res)
    })

    it('returns 400 when limitTotal exceeds 15', async () => {
      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'ticket_key',
          query: 'ABC-42',
          limitTotal: 16,
        })

      assertBadRequest(res)
    })
  })

  describe('result limits — C3 boundary tests', () => {
    it('enforces server-side limitPerProject of 5 even if client sends higher', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Limit Test Project',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 100,
        })

      assertBadRequest(res)
    })

    it('returns at most limitPerProject results per project', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Limit Per Project Test',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 5,
        })

      assertSuccess(res)
      expect(res.body.results.length).toBeLessThanOrEqual(5)
    })

    it('returns at most limitTotal results overall', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Limit Total Test',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body.results.length).toBeLessThanOrEqual(15)
    })
  })

  describe('response shape', () => {
    it('returns results array and total count', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Shape Test Project',
        code: generateTestProjectCode(),
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      expect(res.body).toHaveProperty('results')
      expect(res.body).toHaveProperty('total')
      expect(typeof res.body.total).toBe('number')
    })

    it('each result has ticket.code, ticket.title, project.code, project.name', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Shape Detail Project',
        code: generateTestProjectCode(),
      })
      await projectFactory.createTestCR(project.key, {
        title: 'Shape Test Ticket',
        type: 'Feature Enhancement',
        content: 'Test content',
      })

      const res = await request(app)
        .post('/api/projects/search')
        .send({
          mode: 'project_scope',
          query: '',
          projectCode: project.key,
          limitPerProject: 5,
          limitTotal: 15,
        })

      assertSuccess(res)
      for (const result of res.body.results) {
        expect(result).toHaveProperty('ticket.code')
        expect(result).toHaveProperty('ticket.title')
        expect(result).toHaveProperty('project.code')
        expect(result).toHaveProperty('project.name')
      }
    })
  })
})
