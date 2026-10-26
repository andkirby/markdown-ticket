/**
 * Ticket Create E2E Tests
 *
 * Tests for creating tickets through various command forms.
 */

import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli, runCliWithStdin } from '../helpers/cli-runner.js'

describe('Ticket Create', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string
  let projectCode2: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    // Create a test project
    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
    })

    projectDir = project.path
    projectCode = project.key

    // Create a second project for cross-project create tests
    const project2 = await projectFactory.createProject('empty', {
      code: 'PROJ',
      name: 'Second Project',
    })

    projectCode2 = project2.key
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should create a ticket through canonical ticket create', async () => {
    const result = await runCli(
      ['ticket', 'create', 'feature', 'Test ticket from canonical'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain(`${projectCode}-`)
  })

  test('should create a ticket through top-level create alias', async () => {
    const result = await runCli(['create', 'bug', 'Bug from alias'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain(`${projectCode}-`)
  })

  test('should treat type and priority tokens as order-independent', async () => {
    const result = await runCli(['create', 'high', 'bug', 'Order independent test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // Verify the ticket was created with correct priority
    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      expect(viewResult.stdout).toContain('High')
      expect(viewResult.stdout).toContain('Bug Fix')
    }
  })

  test('should derive title from slug when no quoted title is provided', async () => {
    const result = await runCli(['create', 'feature', 'fix-database-pool'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // Verify title was derived from slug
    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      expect(viewResult.stdout).toContain('Fix Database Pool')
    }
  })

  test('should append literal piped stdin body after generated frontmatter and H1', async () => {
    const stdinBody = '# Additional Content\n\nThis is additional content from stdin.'
    const result = await runCliWithStdin(
      ['create', 'feature', 'Stdin test'],
      stdinBody,
      {
        cwd: projectDir,
      },
    )

    expect(result.exitCode).toBe(0)

    // Read the created file
    const match = result.stdout.match(new RegExp(`docs\\/CRs\\/(${projectCode}-\\d+)[^\\s]*`))
    expect(match).toBeTruthy()

    if (match) {
      const _ticketKey = match[1]
      // Find the actual file path
      const pathMatch = result.stdout.match(new RegExp(`(docs\\/CRs\\/${projectCode}-\\d+[^\\s]*)`))
      expect(pathMatch).toBeTruthy()

      if (pathMatch) {
        const ticketPath = join(projectDir, pathMatch[1])
        const content = await readFile(ticketPath, 'utf-8')

        // Should contain frontmatter and stdin body
        // Note: CLI strips leading H1 from stdin and uses ticket title as authoritative H1
        expect(content).toContain('---') // Frontmatter delimiter
        expect(content).toContain('# Stdin test') // Title-derived H1
        expect(content).toContain('This is additional content from stdin.') // Body preserved
      }
    }
  })

  test('should skip template generation when stdin is present', async () => {
    const stdinBody = 'Custom content only'
    const result = await runCliWithStdin(
      ['create', 'feature', 'No template'],
      stdinBody,
      {
        cwd: projectDir,
      },
    )

    expect(result.exitCode).toBe(0)

    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const _ticketKey = match[0]
      // Find the actual file path from stdout
      const pathMatch = result.stdout.match(new RegExp(`(docs\\/CRs\\/${projectCode}-\\d+[^\\s]*)`))
      expect(pathMatch).toBeTruthy()

      if (pathMatch) {
        const ticketPath = join(projectDir, pathMatch[1])
        const content = await readFile(ticketPath, 'utf-8')

        // Should NOT contain template sections like "## Implementation"
        expect(content).toContain('Custom content only')
        expect(content).not.toContain('## Implementation')
      }
    }
  })

  test('should print the created key and path after create', async () => {
    const result = await runCli(['create', 'feature', 'Path test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain('docs/CRs/')
  })

  test('should derive the title from a single unknown token when no explicit title is present (legacy)', async () => {
    // Without a quoted/multi-word title token there is no enum position to
    // validate: the dash-less unknown word becomes the title (MDT-143 grammar).
    const result = await runCli(['create', 'xyztype'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
  })

  test('should reject an unknown explicit type token without creating a ticket (MDT-263)', async () => {
    const before = await runCli(['ticket', 'list', '--json'], { cwd: projectDir })
    const countBefore = JSON.parse(before.stdout).data.count.total

    const result = await runCli(['create', 'chore/low', 'Probe MDT-263'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown create token \'chore/low\' (part \'chore\')')
    expect(result.stderr).toContain('Valid types:')
    expect(result.stderr).toContain('Valid priorities:')

    const after = await runCli(['ticket', 'list', '--json'], { cwd: projectDir })
    expect(JSON.parse(after.stdout).data.count.total).toBe(countBefore)
  })

  test('should reject an unknown standalone type token when a quoted title is present (MDT-263)', async () => {
    const result = await runCli(['create', 'spike', 'Probe MDT-263 standalone'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown create token \'spike\'')
  })

  test('should emit an ok=false envelope for unknown create tokens in --json mode (MDT-263)', async () => {
    const result = await runCli(['create', 'feature/urgent', 'Probe MDT-263 json', '--json'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(1)
    const envelope = JSON.parse(result.stderr)
    expect(envelope.ok).toBe(false)
    expect(envelope.error.code).toBe('INVALID_CREATE_TOKEN')
    expect(envelope.error.message).toContain('(part \'urgent\')')
    expect(envelope.error.details.validPriorities).toContain('Critical')
  })

  test('should keep project-root-relative path output by default after create', async () => {
    const result = await runCli(['create', 'feature', 'Relative path test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Path should be relative (not starting with /)
    expect(result.stdout).not.toContain('/docs/CRs/')
    expect(result.stdout).toContain('docs/CRs/')
  })

  test('should avoid shell expansion or interpolation of create input data', async () => {
    // Test with special characters that might be interpreted by shell
    const specialTitle = 'Test with $pecial and "quotes"'
    const result = await runCli(['create', 'feature', specialTitle], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      // Title should be preserved literally
      expect(viewResult.stdout).toContain('Test with $pecial and "quotes"')
    }
  })

  test('should use explicit slug in filename when slug argument is provided', async () => {
    const result = await runCli(
      ['create', 'feature/p2', 'Paste selected query to shell from history modal', 'paste-to-shell'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // The output path should use the slug, not the title
    // Bug: currently produces {KEY}-featurep2.md instead of {KEY}-paste-to-shell.md
    expect(result.stdout).toContain('paste-to-shell.md')
    expect(result.stdout).not.toMatch(/\d+-featurep2\.md/)

    // Verify the file actually exists on disk with the slug-based name
    const pathMatch = result.stdout.match(new RegExp(`(docs/CRs/${projectCode}-\\d+-[\\w-]+\\.md)`))
    expect(pathMatch).toBeTruthy()
    expect(pathMatch![1]).toContain('paste-to-shell')
  })

  test('should create a ticket in a target project via --project', async () => {
    const result = await runCli(
      ['ticket', 'create', '--project', projectCode2, 'feature', 'Cross-project ticket'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain(`${projectCode2}-`)
  })

  test('should reject --project when the target project does not exist', async () => {
    const result = await runCli(
      ['ticket', 'create', '--project', 'NOPE', 'feature', 'Test'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Project')
    expect(result.stderr).toContain('NOPE')
    expect(result.stderr).toContain('not found')
  })

  test('refuses ambiguous key reads and mutations through the real CLI (BR-1.10)', async () => {
    const key = `${projectCode}-258`
    const paths = ['original', 'manual'].map(slug => join(projectDir, 'docs/CRs', `${key}-${slug}.md`))
    const content = `---\ncode: ${key}\n---\n# Existing fixture\n`
    for (const path of paths)
      await writeFile(path, content)
    try {
      for (const args of [['ticket', 'get', key, '--json'], ['attr', key, 'priority=High', '--json'], ['delete', key, '--force']]) {
        const result = await runCli(args, { cwd: projectDir })
        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('ambiguous')
      }
      for (const path of paths)
        expect(await readFile(path, 'utf8')).toBe(content)
    }
    finally { for (const path of paths) await rm(path, { force: true }) }
  })

  test('cloud-bound process create skips local high-water and persists its creation identity', async () => {
    const temp = testEnv.getTempDirectory()
    const cert = join(temp, 'fixture-cert.pem')
    const key = join(temp, 'fixture-key.pem')
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=localhost', '-days', '1', '-keyout', key, '-out', cert], { stdio: 'ignore' })
    const requests: Array<Record<string, unknown>> = []
    let acknowledged = 0
    // Keep the native HTTP response implementation outside the repository's
    // frontend test preload (which installs Happy DOM's Response globally).
    const fixtureFile = join(temp, 'coordinator-fixture.ts')
    await writeFile(fixtureFile, `
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, tls: { cert: Bun.file(${JSON.stringify(cert)}), key: Bun.file(${JSON.stringify(key)}) }, async fetch(request) {
  if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/reservations')) {
    const body = await request.json(); console.log(JSON.stringify({ reserve: body }));
    return Response.json({ requestId: 'fixture', data: { reservationId: 'fixture-reservation', ticketNumber: Math.max(258, Number(body.minimumTicketNumber)), protocolVersion: body.protocolVersion, creationId: body.creationId, minimumTicketNumber: body.minimumTicketNumber, state: 'reserved', replayed: false } }, { status: 201 });
  }
  if (request.method === 'PUT') {
    const body = await request.json(); console.log(JSON.stringify({ acknowledgement: body }));
    return Response.json({ requestId: 'fixture', data: { acknowledged: true, projectionVersion: 1, projectRevision: 1, replayed: false } });
  }
  return Response.json({ error: 'Unexpected fixture request' }, { status: 500 });
}}); console.log(JSON.stringify({ port: server.port }));
`)
    const child = Bun.spawn(['bun', fixtureFile], { stdout: 'pipe', stderr: 'inherit' })
    let ready: (port: number) => void = () => {}
    const readyPort = new Promise<number>((resolve) => {
      ready = resolve
    })
    let ackReady: () => void = () => {}
    const ackSeen = new Promise<void>((resolve) => {
      ackReady = resolve
    })
    const output = (async () => {
      const reader = child.stdout.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      while (true) {
        const chunk = await reader.read()
        if (chunk.done)
          break
        pending += decoder.decode(chunk.value)
        let newline: number
        while (pending.includes('\n')) {
          newline = pending.indexOf('\n')
          const line = pending.slice(0, newline)
          pending = pending.slice(newline + 1)
          const value = JSON.parse(line)
          if (value.port)
            ready(value.port)
          if (value.reserve)
            requests.push(value.reserve)
          if (value.acknowledgement) {
            expect(value.acknowledgement.header.creationId).toBe(requests[0].creationId)
            acknowledged++
            ackReady()
          }
        }
      }
    })()
    const origin = `https://127.0.0.1:${await readyPort}`
    const configDir = testEnv.getConfigDirectory()
    const configPath = join(configDir, 'config.toml')
    let previousConfig: string | null = null
    try {
      previousConfig = await readFile(configPath, 'utf8')
    }
    catch { /* fresh fixture */ }
    const current = await runCli(['project', '--json'], { cwd: projectDir })
    expect(current.exitCode).toBe(0)
    const projectId = JSON.parse(current.stdout).meta.projectId as string
    const connectionDir = join(configDir, 'projects', projectId)
    const connection = join(connectionDir, 'cloud-sync.toml')
    await mkdir(connectionDir, { recursive: true })
    const seeded: string[] = []
    try {
      await writeFile(configPath, `[cloudSync]\nallowedOrigins = ["${origin}"]\n`)
      await writeFile(connection, `version = 2\nstate = "enabled"\ncloudProjectId = "35863af3-8bca-4ceb-bc18-5c7bfb3e4188"\nserviceOrigin = "${origin}"\n`)
      for (const n of [258, 259, 260, 261, 262]) {
        const path = join(projectDir, 'docs/CRs', `${projectCode}-${n}-existing.md`)
        await writeFile(path, `---\ncode: ${projectCode}-${n}\n---\n# Existing\n`)
        seeded.push(path)
      }
      const result = await runCliWithStdin(['create', 'feature', 'Above the stale coordinator', '--json', '--stdin'], 'Canonical fixture body.', { cwd: projectDir, env: { NODE_TLS_REJECT_UNAUTHORIZED: '0', CF_ACCESS_CLIENT_ID: 'fixture-only', CF_ACCESS_CLIENT_SECRET: 'fixture-only' } })
      expect(result.exitCode).toBe(0)
      const created = JSON.parse(result.stdout)
      await ackSeen
      expect(created.data.ticket.key).toBe(`${projectCode}-263`)
      expect(requests).toHaveLength(1)
      expect(requests[0].protocolVersion).toBe(2)
      expect(requests[0].minimumTicketNumber).toBe(263)
      expect(acknowledged).toBe(1)
      expect(await readFile(created.data.ticket.paths.absolute, 'utf8')).toContain(`creationId: ${requests[0].creationId}`)
    }
    finally {
      child.kill()
      await child.exited
      await output
      await rm(connection, { force: true })
      for (const path of seeded) await rm(path, { force: true })
      if (previousConfig === null)
        await rm(configPath, { force: true })
      else await writeFile(configPath, previousConfig)
    }
  }, 30000)
})
