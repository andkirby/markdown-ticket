/**
 * Structured Output E2E Tests (UAT Task 14)
 *
 * Tests for agent-safe --json and --yaml output modes.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Structured Output', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string
  let secondProjectCode: string
  let ticketKey: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for structured CLI output',
    })

    projectDir = project.path
    projectCode = project.key

    const secondProject = await projectFactory.createProject('empty', {
      code: 'PROJ',
      name: 'Second Project',
      description: 'Second test project',
    })
    secondProjectCode = secondProject.key

    const cr = await projectFactory.createTestCR(projectCode, {
      title: 'Structured Output Ticket',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: 'Structured output test content',
    })
    ticketKey = cr.crCode!

    const crDir = join(projectDir, 'docs', 'CRs', ticketKey)
    mkdirSync(crDir, { recursive: true })
    writeFileSync(join(crDir, 'notes.md'), '# Notes\n')
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should print ticket detail as JSON and YAML with the same schema', async () => {
    const jsonResult = await runCli(['ticket', 'get', ticketKey, '--json'], { cwd: projectDir })
    const yamlResult = await runCli(['ticket', 'get', ticketKey, '--yaml'], { cwd: projectDir })

    expect(jsonResult.exitCode).toBe(0)
    expect(yamlResult.exitCode).toBe(0)
    expect(jsonResult.stderr).toBe('')
    expect(yamlResult.stderr).toBe('')

    const payload = JSON.parse(jsonResult.stdout)
    expect(payload.schemaVersion).toBe(1)
    expect(payload.ok).toBe(true)
    expect(payload.command).toBe('ticket.get')
    expect(payload.data.ticket.key).toBe(ticketKey)
    expect(payload.data.ticket.paths.relative).toContain('docs/CRs/')
    expect(payload.data.ticket.paths.absolute).toContain(projectDir)
    expect(payload.data.ticket.status).toEqual({ value: 'Proposed', label: 'Proposed' })
    expect(payload.data.ticket.subdocuments[0].path.relative).toContain('notes.md')
    expect(jsonResult.stdout).not.toContain('\x1B[')

    expect(yamlResult.stdout).toContain('schemaVersion: 1')
    expect(yamlResult.stdout).toContain('ok: true')
    expect(yamlResult.stdout).toContain('command: "ticket.get"')
    expect(yamlResult.stdout).toContain(`key: "${ticketKey}"`)
    expect(yamlResult.stdout).not.toContain('\x1B[')
  })

  test('should print ticket list metadata, filters, paths, and pagination in structured mode', async () => {
    const result = await runCli(
      ['ticket', 'list', '--json', '--limit', '1', 'status=proposed'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    const payload = JSON.parse(result.stdout)

    expect(payload.command).toBe('ticket.list')
    expect(payload.data.items.length).toBe(1)
    expect(payload.data.count.returned).toBe(1)
    expect(payload.data.count.total).toBeGreaterThanOrEqual(1)
    expect(payload.data.filters.status).toEqual(['Proposed'])
    expect(payload.data.pagination.limit).toBe(1)
    expect(payload.data.sort).toBe('dateModified')
    expect(payload.data.project.code).toBe(projectCode)
    expect(payload.data.items[0].paths.relative).toContain('docs/CRs/')
  })

  test('should print project current, get, and list payloads in structured mode', async () => {
    const currentResult = await runCli(['project', 'current', '--json'], { cwd: projectDir })
    const getResult = await runCli(['project', 'get', secondProjectCode, '--yaml'], { cwd: projectDir })
    const listResult = await runCli(['project', 'list', '--json'], { cwd: projectDir })

    expect(currentResult.exitCode).toBe(0)
    const currentPayload = JSON.parse(currentResult.stdout)
    expect(currentPayload.command).toBe('project.current')
    expect(currentPayload.data.project.code).toBe(projectCode)
    expect(currentPayload.data.project.paths.root).toBe(projectDir)

    expect(getResult.exitCode).toBe(0)
    expect(getResult.stdout).toContain('command: "project.get"')
    expect(getResult.stdout).toContain(`code: "${secondProjectCode}"`)

    expect(listResult.exitCode).toBe(0)
    const listPayload = JSON.parse(listResult.stdout)
    expect(listPayload.command).toBe('project.list')
    expect(listPayload.data.items.some((project: { code: string }) => project.code === projectCode)).toBe(true)
    expect(listPayload.data.items.some((project: { code: string }) => project.code === secondProjectCode)).toBe(true)
  })

  test('should print create, attr, delete, and project init mutation payloads in structured mode', async () => {
    const createResult = await runCli(
      ['ticket', 'create', '--json', 'feature', 'Structured Create'],
      { cwd: projectDir },
    )

    expect(createResult.exitCode).toBe(0)
    const createPayload = JSON.parse(createResult.stdout)
    const createdKey = createPayload.data.ticket.key
    expect(createPayload.command).toBe('ticket.create')
    expect(createdKey).toContain(`${projectCode}-`)
    expect(createPayload.data.ticket.paths.relative).toContain('docs/CRs/')

    const attrResult = await runCli(
      ['ticket', 'attr', createdKey, 'status=Implemented', '--json'],
      { cwd: projectDir },
    )
    expect(attrResult.exitCode).toBe(0)
    const attrPayload = JSON.parse(attrResult.stdout)
    expect(attrPayload.command).toBe('ticket.attr')
    expect(attrPayload.data.ticket.key).toBe(createdKey)
    expect(attrPayload.data.changes[0]).toMatchObject({
      field: 'status',
      oldValue: 'Proposed',
      newValue: 'Implemented',
    })

    const deleteResult = await runCli(
      ['ticket', 'delete', createdKey, '--force', '--json'],
      { cwd: projectDir },
    )
    expect(deleteResult.exitCode).toBe(0)
    const deletePayload = JSON.parse(deleteResult.stdout)
    expect(deletePayload.command).toBe('ticket.delete')
    expect(deletePayload.data.ticket.key).toBe(createdKey)
    expect(deletePayload.data.deleted).toBe(true)
    expect(existsSync(join(projectDir, deletePayload.data.ticket.paths.relative))).toBe(false)

    const initDir = join(testEnv.getTempDirectory(), 'structured-init')
    mkdirSync(initDir, { recursive: true })
    const initResult = await runCli(
      ['project', 'init', 'NEW', 'Structured Init', '--json'],
      { cwd: initDir },
    )
    expect(initResult.exitCode).toBe(0)
    const initPayload = JSON.parse(initResult.stdout)
    expect(initPayload.command).toBe('project.init')
    expect(initPayload.data.project.code).toBe('NEW')
    expect(initPayload.data.project.paths.root).toContain('structured-init')
  })

  test('should reject commands that include both --json and --yaml', async () => {
    const result = await runCli(['ticket', 'get', ticketKey, '--json', '--yaml'], { cwd: projectDir })

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('mutually exclusive')
  })

  test('should print structured error envelopes to stderr with empty stdout', async () => {
    const result = await runCli(['ticket', 'get', `${projectCode}-999`, '--json'], { cwd: projectDir })

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('')

    const payload = JSON.parse(result.stderr)
    expect(payload.schemaVersion).toBe(1)
    expect(payload.ok).toBe(false)
    expect(payload.command).toBe('ticket.get')
    expect(payload.error.code).toBe('TICKET_NOT_FOUND')
    expect(payload.error.message).toContain(`${projectCode}-999`)
  })
})
