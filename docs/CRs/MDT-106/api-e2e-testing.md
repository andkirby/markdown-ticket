# API E2E Testing Guide (Node/TypeScript)

## Stack

| Tool | Purpose |
|------|---------|
| Jest/Vitest | Test runner + assertions |
| Supertest | HTTP client for Express/Koa/Fastify |
| jest-openapi | Contract validation against OpenAPI spec |

## Project Structure

```
src/
  app.ts          # Express app (no listen)
  server.ts       # Entry point (calls listen)
test/
  config/         # Test-specific configuration
  fixtures/       # Seed data
  setup.ts        # Env vars + global setup
  api/
    users.test.ts
openapi.yaml      # API specification
```

## App Separation Pattern

```typescript
// src/app.ts — export app, don't listen
import express from 'express'

export const app = express()
app.use(express.json())
app.get('/health', (req, res) => res.json({ ok: true }))
```

```typescript
// src/server.ts — production entry point
import { app } from './app'

app.listen(process.env.PORT || 3000)
```

Supertest manages server lifecycle internally — no pre-startup needed.

## Test Setup

```typescript
// test/setup.ts
process.env.NODE_ENV = 'test'
process.env.CONFIG_DIR = './test/config'
```

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  setupFiles: ['./test/setup.ts'],
}
```

## Writing Tests

```typescript
import jestOpenAPI from 'jest-openapi'
// test/api/users.test.ts
import request from 'supertest'
import { app } from '../../src/app'
import { db } from '../../src/db'

jestOpenAPI('./openapi.yaml')

describe('Users API', () => {
  beforeEach(async () => {
    await db.migrate.latest()
  })

  afterEach(async () => {
    await db('users').truncate()
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('POST /users creates user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201)

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'Alice',
    })
    expect(res).toSatisfyApiSpec()
  })

  it('POST /users validates required fields', async () => {
    const res = await request(app)
      .post('/users')
      .send({})
      .expect(400)

    expect(res).toSatisfyApiSpec()
  })
})
```

## Authentication

```typescript
async function getAuthToken() {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'test@example.com', password: 'password' })
  return res.body.token
}

it('accesses protected route', async () => {
  const token = await getAuthToken()

  await request(app)
    .get('/profile')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
})
```

## Mocking External Services

```typescript
import nock from 'nock'

beforeEach(() => {
  nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, { id: 'ch_123', status: 'succeeded' })
})

afterEach(() => nock.cleanAll())
```

## Fastify Variant

```typescript
import Fastify from 'fastify'
import request from 'supertest'

const app = Fastify()
await app.ready()

await request(app.server).get('/health').expect(200)
```

## Key Principles

1. **Separate app from server** — export app instance, listen only in entry point
2. **Real database** — don't mock your own persistence layer
3. **Isolated test data** — each test sets up and cleans up
4. **Mock external services** — Stripe, email, third-party APIs
5. **Validate contracts** — `expect(res).toSatisfyApiSpec()` catches drift

## What This Tests vs. True E2E

Supertest injects requests directly into the app handler, skipping:
- TCP/HTTP networking stack
- Reverse proxy / load balancer
- TLS termination
- Container networking

This is sufficient for 95% of API testing. Reserve full network e2e for staging/pre-deploy smoke tests.
