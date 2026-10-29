// Baseline-only probe: actual adapter writes through two paths to one physical file.
import { readFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { ProjectConfigStorageAdapter } from '../../../../../server/services/config/adapters/ProjectConfigStorageAdapter.js'

const env = new TestEnvironment()
await env.setup()
const factory = new ProjectFactory(env)
try {
  const project = await factory.createProject('empty', { code: 'RACE' })
  const alias = join(env.getTempDirectory(), 'alias')
  symlinkSync(project.path, alias, 'dir')
  const a = new ProjectConfigStorageAdapter(project.path)
  const b = new ProjectConfigStorageAdapter(alias)
  let release!: () => void
  let captured!: () => void
  const entered = new Promise<void>((resolve) => { captured = resolve })
  const resume = new Promise<void>((resolve) => { release = resolve })
  const read = a.read.bind(a)
  a.read = async (forWrite) => {
    const snapshot = await read(forWrite)
    captured()
    await resume
    return snapshot
  }
  const pending = a.write(current => ({ ...current, project: { ...current.project, description: 'first' } }))
  await entered
  await b.write(current => ({ ...current, project: { ...current.project, repository: 'second' } }))
  release()
  await pending
  const bytes = readFileSync(a.filePath, 'utf8')
  console.log(JSON.stringify({ samePhysicalFile: readFileSync(b.filePath, 'utf8') === bytes, firstRetained: bytes.includes('description = "first"'), secondRetained: bytes.includes('repository = "second"') }))
}
finally {
  await factory.cleanup()
  await env.cleanup()
}
