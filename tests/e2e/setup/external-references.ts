import type { E2EContext } from './e2e-context.js'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Real files/configuration in the run-scoped project; no mocked responses. */
export async function createExternalReferenceProject(context: E2EContext) {
  const project = await context.projectFactory.createProject('empty', { name: 'External reference acceptance' })
  await appendFile(join(project.path, '.mdt-config.toml'), `
[trackers.work]
kind = "jira"
baseUrl = "https://jira.example.test/jira"
projectKeys = ["PRJ"]
[trackers.gh]
kind = "github"
baseUrl = "https://github.example.test"
defaultRepo = "acme/widgets"
[trackers.gl]
kind = "gitlab"
baseUrl = "https://gitlab.example.test/context"
defaultRepo = "acme/platform/api"
`)
  async function ticket(title: string, refs: string[]) {
    const created = await context.projectFactory.createTestCR(project.key, {
      title, type: 'Feature Enhancement', status: 'Approved', content: `## Description\n\n${title}.`,
    })
    if (!created.filePath || !created.crCode)
      throw new Error(created.error || 'Failed to create reference fixture')
    const source = await readFile(created.filePath, 'utf8')
    await writeFile(created.filePath, source.replace(/^---\r?\n/, `---\nrefs: ${JSON.stringify(refs)}\n`))
    return { code: created.crCode, path: created.filePath }
  }
  return { project, ticket }
}
