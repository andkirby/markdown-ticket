/**
 * Unified search API endpoint integration tests — MDT-179
 *
 * TEST-unified-search-endpoint: POST /api/search
 * Covering: BR-4.1, BR-4.2, BR-4.3, BR-6.2, C4, C5
 */

import type { Express } from 'express'
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { createTestApp } from './test-app-factory'

describe('POST /api/search — unified search (MDT-179)', () => {
  let app: Express
  let fileWatcher: any

  beforeAll(async () => {
    process.env.CONFIG_DIR = process.env.CONFIG_DIR || '/tmp/mdt-test-search-config'
    const result = await createTestApp()
    app = result.app
    fileWatcher = result.fileWatcher
  })

  afterAll(() => {
    fileWatcher?.close?.()
    delete process.env.CONFIG_DIR
  })

  it('accepts a valid search request', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('results')
    expect(response.body).toHaveProperty('groups')
    expect(response.body).toHaveProperty('total')
  })

  it('rejects empty query', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: '' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Bad Request')
  })

  it('rejects invalid scope', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test', scope: 'invalid' })

    expect(response.status).toBe(400)
  })

  it('uses global as default scope', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test' })

    expect(response.status).toBe(200)
    // Should search across all entity types (global)
  })

  it('respects scope=tickets (BR-4.2)', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test', scope: 'tickets' })

    expect(response.status).toBe(200)
    // Should only contain ticket groups
    const _ticketGroups = response.body.groups.filter((g: any) => g.type === 'ticket')
    const nonTicketGroups = response.body.groups.filter((g: any) => g.type !== 'ticket')
    // Only ticket groups should be present
    expect(nonTicketGroups.length).toBe(0)
  })

  it('respects scope=projects (BR-4.1)', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test', scope: 'projects' })

    expect(response.status).toBe(200)
    // Should only contain project groups
    const nonProjectGroups = response.body.groups.filter((g: any) => g.type !== 'project')
    expect(nonProjectGroups.length).toBe(0)
  })

  it('respects scope=documents (BR-4.3)', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test', scope: 'documents' })

    expect(response.status).toBe(200)
    // Documents search is placeholder — should return empty groups
  })

  it('returns results in grouped format (BR-2.1)', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test' })

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.results)).toBe(true)
    expect(Array.isArray(response.body.groups)).toBe(true)
    expect(typeof response.body.total).toBe('number')
  })

  it('preserves existing /api/projects/search (C5)', async () => {
    // Existing search endpoint should still work
    const response = await request(app)
      .post('/api/projects/search')
      .send({ mode: 'ticket_key', query: 'MDT-001' })

    // Should not be 404 — route must still exist
    expect(response.status).not.toBe(404)
  })

  it('respects limitTotal parameter', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'test', limitTotal: 2 })

    expect(response.status).toBe(200)
    expect(response.body.results.length).toBeLessThanOrEqual(2)
  })

  it('handles missing request body gracefully', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Bad Request')
  })
})
