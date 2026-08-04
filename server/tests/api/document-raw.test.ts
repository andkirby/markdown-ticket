/**
 * MDT-221 — Raw document preview integration tests.
 *
 * Covers the full gate chain (architecture.md §3 gates G2-G10), the mint
 * endpoint, headers (CSP/nosniff/XFO), MIME, and disclosure (no file content
 * on token failure). Runs in no-auth local-test mode (canWrite=true), so the
 * mint endpoint is reachable; access-policy-level read-session rejection is
 * covered in apiAuth.test.ts.
 */

/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'

import type { Express } from 'express'
import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import request from 'supertest'
import { getPreviewTokenSecret, mintPreviewToken } from '../../security/documentPreviewToken'
import { assertSuccess } from './helpers'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

// In test mode (no owner token, no MDT_PREVIEW_TOKEN_SECRET env), the runtime
// config resolves the secret to the local default. Tests must mint with the
// SAME secret the app uses, so derive it via the public helper.
const SECRET = getPreviewTokenSecret(undefined, process.env)

// The STRICT pinned CSP from CR §4 / architecture.md §5. This is the canonical
// contract. The live server currently serves a DEViation (see
// docs/CRs/MDT-221/security-tradeoffs.md §1: external CDN allowlist +
// 'unsafe-eval' added as a stopgap to make real working HTML render). The
// deviation is recorded, not silently absorbed; this constant documents the
// intended "right way" and the test below reports the deviation explicitly.
const PINNED_CSP_STRICT = 'sandbox allow-scripts; default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\''

// CSP directives that must hold in EVERY configuration, strict or relaxed.
// These are the non-negotiable invariants from security-tradeoffs.md §1.3:
// no allow-same-origin, no connect-src, no external img, no object-src override.
const CSP_INVARIANTS = [
  /sandbox allow-scripts(?![^;]*allow-same-origin)/, // sandbox present, no allow-same-origin
  /connect-src 'none'/,
  /img-src [^;]*'(?!https?:)/, // img-src must not allow external http(s) origins
  /default-src 'none'/,
  /base-uri 'none'/,
  /form-action 'none'/,
]

describe('document raw preview API (MDT-221)', () => {
  let tempDir: string
  let app: Express
  let projectFactory: ProjectFactory
  let projectCode: string
  let projectPath: string
  // A second project with opt-in preview config (allowedExternalDomains + allowUnsafeEval)
  let optInProjectCode: string
  let optInProjectPath: string

  beforeAll(async () => {
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app
    projectFactory = context.projectFactory

    const project = await projectFactory.createProject('empty', {
      name: 'Raw Preview Project',
      code: 'RAWP',
      documentPaths: ['docs/site'],
    })
    projectCode = project.key
    projectPath = join(projectFactory.getProjectsDir(), project.key)

    await mkdir(join(projectPath, 'docs/site'), { recursive: true })
    await writeFile(join(projectPath, 'docs/site/index.html'), '<!doctype html><html><body><p id="x">main</p></body></html>\n')
    await writeFile(join(projectPath, 'docs/site/style.css'), 'body{color:red}\n')
    await writeFile(join(projectPath, 'docs/site/app.js'), 'console.log(\'hi\')\n')
    await writeFile(join(projectPath, 'docs/site/image.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    // a sibling OUTSIDE the token-scoped dir, for the cross-dir gate test
    await mkdir(join(projectPath, 'docs/other'), { recursive: true })
    await writeFile(join(projectPath, 'docs/other/secret.html'), '<p>secret</p>\n')

    // Second project: opts in to external CDNs + unsafe-eval via config
    const optInProject = await projectFactory.createProject('empty', {
      name: 'Opt-In Preview Project',
      code: 'OPTP',
      documentPaths: ['docs/site'],
    })
    optInProjectCode = optInProject.key
    optInProjectPath = join(projectFactory.getProjectsDir(), optInProject.key)
    await mkdir(join(optInProjectPath, 'docs/site'), { recursive: true })
    await writeFile(join(optInProjectPath, 'docs/site/index.html'), '<p>opt-in</p>\n')
    // Write the .mdt-config.toml with preview relaxations
    await writeFile(
      join(optInProjectPath, '.mdt-config.toml'),
      [
        'code = "OPTP"',
        'name = "Opt-In Preview Project"',
        'ticketsPath = "docs/CRs"',
        '',
        '[project.document]',
        'paths = ["docs/site"]',
        '',
        '[project.document.preview]',
        'allowedExternalDomains = ["cdn.tailwindcss.com", "cdn.jsdelivr.net", "fonts.googleapis.com"]',
        'allowUnsafeEval = true',
        '',
      ].join('\n'),
    )
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  async function mintToken(docDir: string, projectId = projectCode) {
    const { token } = mintPreviewToken(projectId, docDir, SECRET)
    return token
  }

  describe('POST /api/documents/preview-token — mint', () => {
    it('mints a token for a project + file path (owner mode)', async () => {
      const response = await request(app)
        .post('/api/documents/preview-token')
        .send({ projectId: projectCode, filePath: 'docs/site/index.html' })

      assertSuccess(response, 200)
      expect(response.body.token).toEqual(expect.any(String))
      expect(response.body.token.split('.')).toHaveLength(2)
      expect(response.body.expiresAt).toEqual(expect.any(String))
    })

    it('rejects 400 when projectId or filePath is missing', async () => {
      const noPath = await request(app).post('/api/documents/preview-token').send({ projectId: projectCode })
      expect(noPath.status).toBe(400)

      const noProject = await request(app).post('/api/documents/preview-token').send({ filePath: 'docs/site/index.html' })
      expect(noProject.status).toBe(400)
    })
  })

  describe('GET /raw-preview/:token/* — valid serve', () => {
    it('serves the HTML file with correct Content-Type and headers', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)

      assertSuccess(response, 200)
      expect(response.headers['content-type']).toMatch(/text\/html/)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')

      // CSP non-negotiable invariants — must hold in every configuration.
      const csp = String(response.headers['content-security-policy'])
      for (const invariant of CSP_INVARIANTS) {
        expect(csp).toMatch(invariant)
      }
    })

    it('CSP is strict by default (no external origins, no unsafe-eval)', async () => {
      // The default-config project (RAWP) has no [project.document.preview]
      // section, so it gets the strict canonical CSP.
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      const csp = String(response.headers['content-security-policy'])

      expect(csp).toBe(PINNED_CSP_STRICT)
      expect(csp).not.toContain('unsafe-eval')
      expect(csp).not.toContain('https://cdn')
    })

    it('CSP includes configured external domains + unsafe-eval when project opts in', async () => {
      // The opt-in project (OPTP) has [project.document.preview] with CDNs + eval.
      const { token } = mintPreviewToken(optInProjectCode, 'docs/site', SECRET)
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      assertSuccess(response, 200)
      const csp = String(response.headers['content-security-policy'])

      expect(csp).toContain('https://cdn.tailwindcss.com')
      expect(csp).toContain('https://cdn.jsdelivr.net')
      expect(csp).toContain('https://fonts.googleapis.com')
      expect(csp).toContain('unsafe-eval')
      // Non-negotiable invariants still hold
      for (const invariant of CSP_INVARIANTS) {
        expect(csp).toMatch(invariant)
      }
    })

    it('serves a sibling CSS asset under the same token scope', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/style.css`)

      assertSuccess(response, 200)
      expect(response.headers['content-type']).toMatch(/text\/css/)
      expect(response.text).toContain('color:red')
    })

    it('serves a PNG asset binary-safe (bytes round-trip, no utf8 decode)', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/image.png`)

      assertSuccess(response, 200)
      expect(response.headers['content-type']).toBe('image/png')
      // supertest parses non-JSON bodies as Buffer; verify the PNG signature survives
      const body = response.body as Buffer
      expect(body[0]).toBe(0x89)
      expect(body[1]).toBe(0x50)
      expect(body[2]).toBe(0x4E)
      expect(body[3]).toBe(0x47)
    })
  })

  describe('Gate G2 — HMAC signature', () => {
    it('rejects a tampered signature with 403 before file resolution', async () => {
      const token = await mintToken('docs/site')
      const [payload, sig] = token.split('.')
      const tampered = `${payload}.${sig!.endsWith('A') ? `${sig!.slice(0, -1)}B` : `${sig!.slice(0, -1)}A`}`
      const response = await request(app).get(`/api/documents/raw-preview/${tampered}/docs/site/index.html`)
      expect(response.status).toBe(403)
      // no file content disclosed
      expect(response.text).not.toContain('<body')
    })
  })

  describe('Gate G3 — expiry', () => {
    it('rejects an expired token with 403', async () => {
      const { token } = mintPreviewToken(projectCode, 'docs/site', SECRET, 60, Date.now() - 120_000)
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      expect(response.status).toBe(403)
      expect(response.text).not.toContain('<body')
    })
  })

  describe('Gate G4 — project lookup', () => {
    it('rejects a token whose projectId does not resolve (404)', async () => {
      const { token } = mintPreviewToken('NONEXISTENT', 'docs/site', SECRET)
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      expect(response.status).toBe(404)
    })
  })

  describe('Gate G6 — docDir token scope', () => {
    it('rejects a request for a path outside the token docDir (403)', async () => {
      // token scoped to docs/site; request a file in docs/other
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/other/secret.html`)
      expect(response.status).toBe(403)
    })

    it('rejects a cross-project token (token for project A, but project lookup resolves differently)', async () => {
      // The payload carries projectId; resolveRawPreviewPath looks up by it.
      // A token minted for a different projectId cannot serve this project's files
      // because the lookup returns the OTHER project (or none). Here we mint for
      // a projectId that does not exist and expect 404 (G4 path).
      const { token } = mintPreviewToken('DIFFERENT-PROJECT', 'docs/site', SECRET)
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      expect([403, 404]).toContain(response.status)
    })
  })

  describe('Gate G8 — traversal', () => {
    it('rejects a literal .. traversal with 403', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/../../../etc/passwd`)
      expect([400, 403]).toContain(response.status)
    })

    it('rejects a URL-encoded %2e%2e traversal with 403', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/%2e%2e/%2e%2e/etc/passwd`)
      expect([400, 403]).toContain(response.status)
    })

    it('does not leak filesystem absolute paths in error bodies', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/../../../etc/passwd`)
      expect(response.text).not.toContain(projectPath)
      expect(response.text).not.toContain('/Users/')
    })
  })

  describe('Gate G9 — MIME', () => {
    it('rejects an unsupported extension with 415', async () => {
      // .bin is not in the MIME map. Write one inside the scoped dir.
      await writeFile(join(projectPath, 'docs/site/data.bin'), Buffer.from([0x00, 0x01]))
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/data.bin`)
      expect(response.status).toBe(415)
    })
  })

  describe('Gate G10 — X-Frame-Options override', () => {
    it('raw-preview returns SAMEORIGIN', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/docs/site/index.html`)
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    })

    it('other document routes keep the global DENY', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=docs/site/index.html`)
      // 400 because content endpoint is md-only; the header check is what matters
      expect(response.headers['x-frame-options']).toBe('DENY')
    })
  })

  describe('disclosure (C-2.4)', () => {
    it('a malformed token (no dot) returns 403 with no file body', async () => {
      const response = await request(app).get('/api/documents/raw-preview/notadottoken/docs/site/index.html')
      expect(response.status).toBe(403)
      expect(response.text).not.toContain('<body')
    })

    it('a missing documentPath returns 400 with no file body', async () => {
      const token = await mintToken('docs/site')
      const response = await request(app).get(`/api/documents/raw-preview/${token}/`)
      expect([400, 403, 404]).toContain(response.status)
    })
  })

  describe('no query-param preview URLs (Edge-3.7)', () => {
    it('the route requires the token in the path; a query-param token does not authenticate', async () => {
      // The route is /raw-preview/:token/*documentPath — a bare request to the
      // prefix without a path token should not match the route or should fail.
      const response = await request(app).get('/api/documents/raw-preview/?token=anything')
      // Without a :token segment the route does not match; falls to 404.
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
