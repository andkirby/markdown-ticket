import type { ScopeWriteResult } from '../../services/config/types.js'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig.js'
import { createConfigRouter } from '../../modules/config/index.js'
import { ProjectConfigStorageAdapter } from '../../services/config/adapters/ProjectConfigStorageAdapter.js'

describe('MDT-266 overlapping config request contexts', () => {
  it.each([false, true])('retains originating project while another request overlaps (second rejected=%s)', async (rejectSecond) => {
    const env = new TestEnvironment()
    await env.setup()
    const factory = new ProjectFactory(env)
    const first = await factory.createProject('empty', { code: 'FIRST' })
    const second = await factory.createProject('empty', { code: 'SECOND' })
    const effects: string[] = []
    const app = express()
    app.locals.runtimeConfig = buildRuntimeConfig({ CONFIG_DIR: env.getConfigDirectory(), NODE_ENV: 'test' })
    app.use(express.json())
    app.use('/config', createConfigRouter({
      resolveProjectPath: req => req.query.projectId === 'first' ? first.path : second.path,
      resolveProjectId: req => String(req.query.projectId),
      reconfigureDocumentWatchers: async (id) => {
        effects.push(id)
        return 0
      },
    }))
    let release!: () => void
    let entered!: () => void
    const paused = new Promise<void>((resolve) => {
      entered = resolve
    })
    const resume = new Promise<void>((resolve) => {
      release = resolve
    })
    const write = ProjectConfigStorageAdapter.prototype.write
    const spy = jest.spyOn(ProjectConfigStorageAdapter.prototype, 'write').mockImplementation(async function (this: ProjectConfigStorageAdapter, mutator): Promise<ScopeWriteResult> {
      const result = await write.call(this, mutator)
      if (this.filePath.startsWith(first.path)) {
        entered()
        await resume
      }
      return result
    })
    let pending: Promise<request.Response> | undefined
    try {
      pending = request(app).patch('/config?projectId=first').send({ selector: 'project.document.maxDepth', value: 4 }).then(res => res)
      await paused
      const other = await request(app).patch('/config?projectId=second').send({ selector: 'project.document.maxDepth', value: rejectSecond ? 'invalid' : 5 })
      expect(other.status).toBe(rejectSecond ? 400 : 200)
      release()
      expect((await pending).status).toBe(200)
      expect(effects).toEqual(rejectSecond ? ['first'] : ['second', 'first'])
    }
    finally {
      release()
      await pending
      spy.mockRestore()
      await factory.cleanup()
      await env.cleanup()
    }
  })
})
