/**
 * Tickets/Legacy Tasks API Tests - MDT-106.
 *
 * Comprehensive API tests for legacy task endpoints.
 * Tests cover /api/tasks routes for listing, retrieving, saving, and deleting tasks.
 *
 * Test Coverage:
 * - GET /api/tasks - List all task files
 * - GET /api/tasks/:filename - Get specific task content
 * - POST /api/tasks/save - Create/update task files
 * - Malformed YAML handling (R6.3)
 * - File system error handling (R6.4)
 * - OpenAPI contract validation (R10.1).
 */

/// <reference types="jest" />

import type { Express } from 'express'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { TicketController } from '../../controllers/TicketController'
import { createTicketRouter } from '../../routes/tickets'
import { FileSystemService } from '../../services/FileSystemService'
import { malformedYAMLFixtures } from './fixtures/tickets'
import {
  assertBadRequest,
  assertErrorMessage,
  assertIsArray,
  assertNotFound,
  assertStatus,
  assertSuccess,
  createDeleteRequest,
  createGetRequest,
  createPostRequest,
} from './helpers'

describe('tickets/Legacy Tasks API Tests (MDT-106)', () => {
  let app: Express
  let tempDir: string
  let tasksDir: string
  let fileSystemService: FileSystemService
  let ticketController: TicketController

  beforeAll(() => {
    // Create temporary directory for test tasks
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-tasks-test-'))
    tasksDir = join(tempDir, 'sample-tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(tasksDir, 'task-001.md'), '# Task 1\n\nSample task content')
    writeFileSync(join(tasksDir, 'task-002.md'), '# Task 2\n\nAnother task')
    writeFileSync(join(tasksDir, 'bug-123.md'), '# Bug Report\n\nFix this issue')

    // Create Express app with test routes
    app = express()
    app.use(express.json())
    fileSystemService = new FileSystemService(tasksDir)
    ticketController = new TicketController(fileSystemService)
    app.use('/api/tasks', createTicketRouter(ticketController))
  })

  afterAll(() => {
    // Cleanup temporary directory
    if (existsSync(tempDir) && tempDir.startsWith(tmpdir())) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('gET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'mdt-empty-'))
      const emptyFS = new FileSystemService(emptyDir)
      const emptyController = new TicketController(emptyFS)
      const emptyApp = express()

      emptyApp.use(express.json())
      emptyApp.use('/api/tasks', createTicketRouter(emptyController))

      const response = await createGetRequest(emptyApp, '/api/tasks')

      assertSuccess(response, 200)
      assertIsArray(response)
      expect(response.body).toHaveLength(0)
      rmSync(emptyDir, { recursive: true, force: true })
    })

    it('should list all task files', async () => {
      const response = await createGetRequest(app, '/api/tasks')

      assertSuccess(response, 200)
      assertIsArray(response)
      expect(response.body.length).toBeGreaterThanOrEqual(3)
      expect(response.body).toContain('task-001.md')
      expect(response.body).toContain('task-002.md')
      expect(response.body).toContain('bug-123.md')
    })

    it('should return success response 200', async () => {
      const response = await createGetRequest(app, '/api/tasks')

      assertStatus(response, 200)
    })
  })

  describe('gET /api/tasks/:filename', () => {
    it('should get task by filename successfully', async () => {
      const response = await createGetRequest(app, '/api/tasks/task-001.md')

      assertSuccess(response, 200)
      expect(response.text).toContain('# Task 1')
      expect(response.text).toContain('Sample task content')
      // Express sends content as text/html by default for string responses
      expect(response.headers['content-type']).toMatch(/text/)
    })

    it('should return 404 for non-existent task', async () => {
      const response = await createGetRequest(app, '/api/tasks/nonexistent.md')

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })

    it('should return 404 for empty filename', async () => {
      const response = await createGetRequest(app, '/api/tasks/.md')

      assertNotFound(response)
    })

    it('should return task with special characters in content', async () => {
      const specialTaskPath = join(tasksDir, 'special-task.md')

      writeFileSync(specialTaskPath, '# Special Task\n\nUnicode: 你好\nEmoji: 🎉\nCode: `const x = 1;`')
      const response = await createGetRequest(app, '/api/tasks/special-task.md')

      assertSuccess(response, 200)
      expect(response.text).toContain('你好')
      expect(response.text).toContain('🎉')
      expect(response.text).toContain('const x = 1;')
    })

    it('should return task with long content', async () => {
      const longContent = `# Long Task\n\n${'This is a line.\n'.repeat(100)}`
      const longTaskPath = join(tasksDir, 'long-task.md')

      writeFileSync(longTaskPath, longContent)
      const response = await createGetRequest(app, '/api/tasks/long-task.md')

      assertSuccess(response, 200)
      expect(response.text.length).toBeGreaterThan(1000)
    })
  })

  describe('pOST /api/tasks/save', () => {
    it('should create new task with valid data', async () => {
      const newTaskData = {
        filename: 'new-task.md',
        content: '# New Task\n\nThis is a newly created task',
      }
      const response = await createPostRequest(app, '/api/tasks/save', newTaskData)

      assertSuccess(response, 200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('filename', 'new-task.md')
      const createdPath = join(tasksDir, 'new-task.md')

      expect(existsSync(createdPath)).toBe(true)
    })

    it('should update existing task', async () => {
      const updateData = {
        filename: 'task-001.md',
        content: '# Updated Task 1\n\nThis content has been updated',
      }
      const response = await createPostRequest(app, '/api/tasks/save', updateData)

      assertSuccess(response, 200)
      expect(response.body).toHaveProperty('success', true)
      const updatedContent = await fileSystemService.getTask('task-001.md')

      expect(updatedContent).toContain('updated')
    })

    it('should return 400 for missing filename', async () => {
      const response = await createPostRequest(app, '/api/tasks/save', { content: '# Task\n\nContent' })

      assertBadRequest(response)
      assertErrorMessage(response, 'required')
    })

    it('should return 400 for missing content', async () => {
      const response = await createPostRequest(app, '/api/tasks/save', { filename: 'test.md' })

      assertBadRequest(response)
      assertErrorMessage(response, 'required')
    })

    it('should return 400 for missing both filename and content', async () => {
      const response = await createPostRequest(app, '/api/tasks/save', {})

      assertBadRequest(response)
      assertErrorMessage(response, 'required')
    })

    it('should return 200 on success with proper message', async () => {
      const taskData = {
        filename: 'success-task.md',
        content: '# Success Task\n\nTesting success response',
      }
      const response = await createPostRequest(app, '/api/tasks/save', taskData)

      assertStatus(response, 200)
      expect(response.body.message).toContain('saved')
    })

    it('should sanitize filename to prevent path traversal', async () => {
      const maliciousData = {
        filename: '../../../etc/passwd',
        content: 'malicious content',
      }
      const response = await createPostRequest(app, '/api/tasks/save', maliciousData)

      assertSuccess(response, 200)
      expect(response.body.filename).toBe('passwd')
    })
  })

  describe('malformed YAML handling (R6.3)', () => {
    const yamlFixtures = [
      { name: 'invalidIndentation', content: malformedYAMLFixtures.invalidIndentation },
      { name: 'missingColon', content: malformedYAMLFixtures.missingColon },
      { name: 'unclosedQuote', content: malformedYAMLFixtures.unclosedQuote },
      { name: 'invalidList', content: malformedYAMLFixtures.invalidList },
      { name: 'duplicateKeys', content: malformedYAMLFixtures.duplicateKeys },
    ]

    it.each(yamlFixtures)('should handle $name gracefully', async ({ name, content }) => {
      const taskData = { filename: `malformed-${name}.md`, content }
      const response = await createPostRequest(app, '/api/tasks/save', taskData)

      assertSuccess(response, 200)
    })
  })

  describe('file system error handling (R6.4)', () => {
    it('should handle directory not existing', async () => {
      const nonExistentDir = join(tempDir, 'does-not-exist')
      const errorFS = new FileSystemService(nonExistentDir)
      const errorController = new TicketController(errorFS)
      const errorApp = express()

      errorApp.use(express.json())
      errorApp.use('/api/tasks', createTicketRouter(errorController))
      const response = await createGetRequest(errorApp, '/api/tasks')

      assertStatus(response, 500)
    })

    it('should handle permission errors gracefully', async () => {
      const invalidPath = '/root/no-permission-tasks'
      const restrictedFS = new FileSystemService(invalidPath)
      const restrictedController = new TicketController(restrictedFS)
      const restrictedApp = express()

      restrictedApp.use(express.json())
      restrictedApp.use('/api/tasks', createTicketRouter(restrictedController))
      const response = await createGetRequest(restrictedApp, '/api/tasks')

      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle getting non-existent task', async () => {
      const response = await createGetRequest(app, '/api/tasks/definitely-not-a-task.md')

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })

    it('should handle disk space errors (simulated)', async () => {
      const hugeContent = `# Huge Task\n\n${'x'.repeat(10_000_000)}`
      const taskData = { filename: 'huge-task.md', content: hugeContent }
      const response = await createPostRequest(app, '/api/tasks/save', taskData)

      if (response.status === 200) {
        expect(response.body.success).toBe(true)
      }
      else {
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('dELETE /api/tasks/:filename', () => {
    it('should delete task successfully', async () => {
      const deletePath = join(tasksDir, 'to-delete.md')

      writeFileSync(deletePath, '# Delete Me\n\nThis will be deleted')
      const response = await createDeleteRequest(app, '/api/tasks/to-delete.md')

      assertSuccess(response, 200)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body.message).toContain('deleted')
      expect(existsSync(deletePath)).toBe(false)
    })

    it('should return 404 when deleting non-existent task', async () => {
      const response = await createDeleteRequest(app, '/api/tasks/already-deleted.md')

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })

    it('should return 404 for empty filename', async () => {
      const response = await createDeleteRequest(app, '/api/tasks/.md')

      assertNotFound(response)
    })
  })

  describe('openAPI contract validation (R10.1)', () => {
    it('should satisfy OpenAPI spec for GET /api/tasks', async () => {
      const response = await createGetRequest(app, '/api/tasks')

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      if (response.body.length > 0) {
        expect(typeof response.body[0]).toBe('string')
      }
    })

    it('should satisfy OpenAPI spec for GET /api/tasks/:filename', async () => {
      const response = await createGetRequest(app, '/api/tasks/task-001.md')

      assertSuccess(response, 200)
      expect(response.headers['content-type']).toMatch(/text/)
      expect(typeof response.text).toBe('string')
    })

    it('should satisfy OpenAPI spec for POST /api/tasks/save', async () => {
      const taskData = {
        filename: 'openapi-test.md',
        content: '# OpenAPI Test\n\nValidating contract',
      }
      const response = await createPostRequest(app, '/api/tasks/save', taskData)

      assertSuccess(response, 200)
      expect(response.body).toHaveProperty('success')
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('filename')
    })

    it('should return 400 error conforming to OpenAPI spec for missing fields', async () => {
      const response = await createPostRequest(app, '/api/tasks/save', { filename: 'test.md' })

      assertBadRequest(response)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 error conforming to OpenAPI spec for non-existent task', async () => {
      const response = await createGetRequest(app, '/api/tasks/not-found.md')

      assertNotFound(response)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('edge cases and integration scenarios', () => {
    it('should handle tasks with markdown code blocks', async () => {
      const codeContent = `# Code Task

\`\`\`typescript
const example: string = 'test'
function test() {
  return true
}
\`\`\`

\`\`\`javascript
const js = 'javascript'
\`\`\`
`
      const codeData = { filename: 'code-task.md', content: codeContent }
      const response = await createPostRequest(app, '/api/tasks/save', codeData)

      assertSuccess(response, 200)
      const retrieved = await createGetRequest(app, '/api/tasks/code-task.md')

      expect(retrieved.text).toContain('typescript')
      expect(retrieved.text).toContain('function test()')
    })

    it('should handle tasks with YAML frontmatter', async () => {
      const yamlContent = `---
title: Test Task
status: In Progress
priority: High
---

# Task Content

This task has YAML frontmatter.
`
      const yamlData = { filename: 'yaml-task.md', content: yamlContent }
      const response = await createPostRequest(app, '/api/tasks/save', yamlData)

      assertSuccess(response, 200)
      const retrieved = await createGetRequest(app, '/api/tasks/yaml-task.md')

      expect(retrieved.text).toContain('title: Test Task')
      expect(retrieved.text).toContain('status: In Progress')
    })

    it('should handle concurrent save operations', async () => {
      const saves = [
        createPostRequest(app, '/api/tasks/save', { filename: 'concurrent-1.md', content: '# Task 1' }),
        createPostRequest(app, '/api/tasks/save', { filename: 'concurrent-2.md', content: '# Task 2' }),
        createPostRequest(app, '/api/tasks/save', { filename: 'concurrent-3.md', content: '# Task 3' }),
      ]
      const responses = await Promise.all(saves)

      responses.forEach((response) => {
        assertSuccess(response, 200)
      })
    })

    it('should list only .md files', async () => {
      writeFileSync(join(tasksDir, 'not-a-task.txt'), 'text file')
      writeFileSync(join(tasksDir, 'image.png'), 'fake image')
      const response = await createGetRequest(app, '/api/tasks')

      assertSuccess(response, 200)
      expect(response.body).toContain('task-001.md')
      expect(response.body).not.toContain('not-a-task.txt')
      expect(response.body).not.toContain('image.png')
    })
  })
})
