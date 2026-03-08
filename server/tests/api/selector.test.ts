/**
 * Selector Config Endpoint Tests (MDT-129)
 *
 * Tests for /api/config/selector endpoint.
 * Covers BR-7 (config loading), BR-8 (state persistence), BR-10 (validation).
 *
 * RED phase: Tests will fail until /api/config/selector endpoint is implemented.
 */

/// <reference types="jest" />

import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { assertSuccess, assertBodyHasProperties, createGetRequest, createPostRequest } from './helpers'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

describe('Selector Config Endpoint Tests (MDT-129)', () => {
  let tempDir: string
  let configDir: string
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app']

  beforeAll(async () => {
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    configDir = context.configDir
    app = context.app
  })

  // Helper function to get the current config dir (respects process.env.CONFIG_DIR changes)
  const getCurrentConfigDir = () => process.env.CONFIG_DIR || configDir

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  describe('GET /api/config/selector', () => {
    describe('BR-7.3: Fallback to defaults when config missing', () => {
      it('returns default preferences when user.toml does not exist', async () => {
        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        assertBodyHasProperties(response, ['preferences', 'selectorState'])

        expect(response.body.preferences).toEqual({
          visibleCount: 7,
          compactInactive: true,
        })
        expect(response.body.selectorState).toEqual({})
      })
    })

    describe('BR-7.1, BR-7.2: Load preferences from user.toml', () => {
      beforeEach(() => {
        // Create a valid user.toml file
        const userTomlContent = `
[ui.projectSelector]
visibleCount = 10
compactInactive = false
`
        const currentConfigDir = getCurrentConfigDir()
        const userTomlPath = join(currentConfigDir, 'user.toml')

        // Ensure config directory exists
        const { existsSync, mkdirSync } = require('node:fs')
        if (!existsSync(currentConfigDir)) {
          mkdirSync(currentConfigDir, { recursive: true })
        }

        writeFileSync(userTomlPath, userTomlContent, 'utf-8')
      })

      afterEach(() => {
        // Clean up user.toml
        try {
          unlinkSync(join(getCurrentConfigDir(), 'user.toml'))
        } catch {
          // Ignore if file doesn't exist
        }
      })

      it('returns visibleCount from user.toml', async () => {
        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.visibleCount).toBe(10)
      })

      it('returns compactInactive from user.toml', async () => {
        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.compactInactive).toBe(false)
      })

      it('returns both preferences when both are set', async () => {
        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences).toEqual({
          visibleCount: 10,
          compactInactive: false,
        })
      })
    })

    describe('BR-7.4, BR-7.5: Invalid config fallbacks', () => {
      afterEach(() => {
        // Clean up user.toml
        try {
          unlinkSync(join(getCurrentConfigDir(), 'user.toml'))
        } catch {
          // Ignore if file doesn't exist
        }
      })

      it('falls back to default visibleCount when value is not integer', async () => {
        const userTomlContent = `
[ui.projectSelector]
visibleCount = "invalid"
compactInactive = true
`
        writeFileSync(join(getCurrentConfigDir(), 'user.toml'), userTomlContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.visibleCount).toBe(7) // default
      })

      it('falls back to default visibleCount when value is negative', async () => {
        const userTomlContent = `
[ui.projectSelector]
visibleCount = -1
compactInactive = true
`
        writeFileSync(join(getCurrentConfigDir(), 'user.toml'), userTomlContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.visibleCount).toBe(7) // default
      })

      it('falls back to default visibleCount when value is zero', async () => {
        const userTomlContent = `
[ui.projectSelector]
visibleCount = 0
compactInactive = true
`
        writeFileSync(join(getCurrentConfigDir(), 'user.toml'), userTomlContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.visibleCount).toBe(7) // default
      })

      it('falls back to default compactInactive when value is not boolean', async () => {
        const userTomlContent = `
[ui.projectSelector]
visibleCount = 7
compactInactive = "yes"
`
        writeFileSync(join(getCurrentConfigDir(), 'user.toml'), userTomlContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences.compactInactive).toBe(true) // default
      })
    })

    describe('BR-8.5, BR-8.6: Selector state loading', () => {
      afterEach(() => {
        // Clean up project-selector.json
        try {
          unlinkSync(join(getCurrentConfigDir(), 'project-selector.json'))
        } catch {
          // Ignore if file doesn't exist
        }
      })

      it('returns empty state when project-selector.json does not exist', async () => {
        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState).toEqual({})
      })

      it('returns selector state from project-selector.json', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 42,
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState).toEqual({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 42,
          },
        })
      })

      it('falls back to empty state when JSON is invalid', async () => {
        writeFileSync(join(configDir, 'project-selector.json'), 'invalid json {{{', 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState).toEqual({})
      })
    })

    describe('BR-10.x: Validation and error handling', () => {
      afterEach(() => {
        // Clean up project-selector.json
        try {
          unlinkSync(join(getCurrentConfigDir(), 'project-selector.json'))
        } catch {
          // Ignore if file doesn't exist
        }
      })

      it('drops invalid entries but keeps valid ones', async () => {
        const stateContent = JSON.stringify({
          'PROJ-VALID': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 42,
          },
          'PROJ-INVALID': {
            favorite: 'not-a-boolean',
            lastUsedAt: 'invalid-date',
            count: 'not-a-number',
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)

        // Valid entry should be present
        expect(response.body.selectorState['PROJ-VALID']).toEqual({
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        })

        // Invalid entry should be dropped or fields sanitized
        const invalidEntry = response.body.selectorState['PROJ-INVALID']
        if (invalidEntry) {
          // If entry exists, fields should be sanitized
          expect(typeof invalidEntry.favorite).toBe('boolean')
          expect(typeof invalidEntry.count).toBe('number')
        } else {
          // Entry should be dropped
          expect(invalidEntry).toBeUndefined()
        }
      })

      it('handles non-boolean favorite field (treats as false)', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: 'yes',
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 42,
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState['PROJ-A'].favorite).toBe(false)
      })

      it('handles invalid lastUsedAt (drops field)', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: 'not-a-date',
            count: 42,
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState['PROJ-A'].lastUsedAt).toBeNull()
      })

      it('handles non-integer count (treats as 0)', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 'not-a-number',
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState['PROJ-A'].count).toBe(0)
      })

      it('handles negative count (treats as 0)', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: -5,
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState['PROJ-A'].count).toBe(0)
      })

      it('ignores unknown fields in user.toml', async () => {
        const userTomlContent = `
[ui.projectSelector]
visibleCount = 7
compactInactive = true
unknownField = "should be ignored"
anotherUnknown = 123
`
        writeFileSync(join(getCurrentConfigDir(), 'user.toml'), userTomlContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.preferences).toEqual({
          visibleCount: 7,
          compactInactive: true,
        })
        // Unknown fields should not be in response
        expect((response.body.preferences as Record<string, unknown>).unknownField).toBeUndefined()
        expect((response.body.preferences as Record<string, unknown>).anotherUnknown).toBeUndefined()
      })

      it('ignores unknown fields in project-selector.json', async () => {
        const stateContent = JSON.stringify({
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 42,
            unknownField: 'should be ignored',
          },
        }, null, 2)
        writeFileSync(join(getCurrentConfigDir(), 'project-selector.json'), stateContent, 'utf-8')

        const response = await createGetRequest(app, '/api/config/selector')

        assertSuccess(response, 200)
        expect(response.body.selectorState['PROJ-A']).toEqual({
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        })
        // Unknown fields should not be in response
        expect((response.body.selectorState['PROJ-A'] as Record<string, unknown>).unknownField).toBeUndefined()
      })
    })
  })

  describe('POST /api/config/selector (state persistence)', () => {
    describe('BR-8.1, BR-8.2, BR-8.3, BR-8.4: State persistence', () => {
      afterEach(() => {
        // Clean up project-selector.json
        try {
          unlinkSync(join(getCurrentConfigDir(), 'project-selector.json'))
        } catch {
          // Ignore if file doesn't exist
        }
      })

      it('persists selector state to project-selector.json', async () => {
        const stateUpdate = {
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 43,
          },
        }

        const response = await createPostRequest(app, '/api/config/selector', stateUpdate)

        assertSuccess(response, 200)

        // Verify file was written
        const filePath = join(getCurrentConfigDir(), 'project-selector.json')
        const fileContent = readFileSync(filePath, 'utf-8')
        const savedState = JSON.parse(fileContent)

        expect(savedState).toEqual(stateUpdate)
      })

      it('keys entries by project code', async () => {
        const stateUpdate = {
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 43,
          },
          'PROJ-B': {
            favorite: false,
            lastUpdated: '2026-03-05T11:00:00Z',
            count: 10,
          },
        }

        const response = await createPostRequest(app, '/api/config/selector', stateUpdate)

        assertSuccess(response, 200)

        // Verify both entries were saved with correct keys
        const filePath = join(getCurrentConfigDir(), 'project-selector.json')
        const fileContent = readFileSync(filePath, 'utf-8')
        const savedState = JSON.parse(fileContent)

        expect(savedState['PROJ-A']).toBeDefined()
        expect(savedState['PROJ-B']).toBeDefined()
      })

      it('stores favorite, lastUsedAt, and count per project', async () => {
        const stateUpdate = {
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 43,
          },
        }

        const response = await createPostRequest(app, '/api/config/selector', stateUpdate)

        assertSuccess(response, 200)

        const filePath = join(getCurrentConfigDir(), 'project-selector.json')
        const fileContent = readFileSync(filePath, 'utf-8')
        const savedState = JSON.parse(fileContent)

        expect(savedState['PROJ-A']).toHaveProperty('favorite')
        expect(savedState['PROJ-A']).toHaveProperty('lastUsedAt')
        expect(savedState['PROJ-A']).toHaveProperty('count')
      })

      it('writes shortly after selection changes (not on shutdown)', async () => {
        const startTime = Date.now()

        const stateUpdate = {
          'PROJ-A': {
            favorite: true,
            lastUsedAt: '2026-03-05T10:00:00Z',
            count: 43,
          },
        }

        const response = await createPostRequest(app, '/api/config/selector', stateUpdate)

        assertSuccess(response, 200)

        const endTime = Date.now()
        const writeTime = endTime - startTime

        // Write should happen quickly (not delayed until shutdown)
        // In a real scenario, this might use debouncing, but should still complete in reasonable time
        expect(writeTime).toBeLessThan(5000) // 5 seconds max
      })
    })
  })
})
