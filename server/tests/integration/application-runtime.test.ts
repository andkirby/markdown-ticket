import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { ProjectStateStore } from '@mdt/shared/services/cloud-sync/project-state-store.js'
import { CloudProjectionSync } from '@mdt/shared/services/cloud-sync/projection-sync.js'
import { ProjectConfigService } from '@mdt/shared/services/project/ProjectConfigService.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import request from 'supertest'
import { createApplication } from '../../app.js'
import { buildRuntimeConfig } from '../../config/runtimeConfig.js'

jest.mock('@mdt/shared/services/ProjectService.js', () => jest.requireActual('../../../shared/services/ProjectService.ts'))

describe('MDT-266 common real-source application and runtime', () => {
  const env = new TestEnvironment()
  let factory: ProjectFactory
  let handle: ReturnType<typeof createApplication> | undefined
  beforeEach(async () => {
    await env.setup()
    factory = new ProjectFactory(env)
  })
  afterEach(async () => {
    await handle?.runtime.stop()
    jest.restoreAllMocks()
    await factory.cleanup()
    await env.cleanup()
  })
  function construct(rollout = false) {
    const discovery = new ProjectService(true)
    discovery.setCacheTTL(0)
    const runtimeConfig = buildRuntimeConfig({ NODE_ENV: 'test', CONFIG_DIR: env.getConfigDirectory(), API_SECURITY_AUTH: 'true', API_LOCAL_HOST_BYPASS: 'false', API_AUTH_TOKEN: 'isolated-owner', MDT_PROJECTION_STREAM_ROLLOUT: String(rollout) })
    handle = createApplication({ projectDiscovery: discovery, runtimeConfig })
    return handle
  }
  it('constructs without activation, serves the production route graph and disposes owned work', async () => {
    const project = await factory.createProject('empty', { code: 'TEST' })
    const created = await factory.createTestCR(project.key, { title: 'Runtime ticket', type: 'Research', content: 'Original body' })
    const signalCounts = ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal))
    const app = construct()
    const heartbeat = jest.spyOn(app.fileWatcher, 'startHeartbeat')
    const stop = jest.spyOn(app.fileWatcher, 'stop')
    expect(app.runtime.state).toBe('constructed')
    expect(app.fileWatcher.watchers.size).toBe(0)
    expect(app.fileWatcher.listenerCount('registry-change')).toBe(0)
    expect(heartbeat).not.toHaveBeenCalled()
    expect(['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal))).toEqual(signalCounts)
    expect((await request(app.app).get('/api/status')).status).toBe(200)
    expect((await request(app.app).patch(`/api/projects/${project.key}/crs/${created.crCode}`).send({ status: 'In Progress' })).status).toBe(403)
    await Promise.all([app.runtime.start(), app.runtime.start()])
    expect(app.runtime.state).toBe('started')
    expect(heartbeat).toHaveBeenCalledTimes(1)
    expect(app.fileWatcher.listenerCount('registry-change')).toBe(1)
    const auth = request.agent(app.app)
    auth.set('Authorization', 'Bearer isolated-owner')
    const unified = await auth.get(`/api/projects/${project.key}/tickets/unified`)
    expect(unified.status).toBe(200)
    expect(unified.body).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'canonical', code: created.crCode, readOnly: false })]))
    const resolved = (await app.projectDiscovery.getAllProjects()).find(entry => entry.project.code === project.key)!
    expect((await auth.get(`/api/projects/${resolved.id}/ticket-identities`)).status).toBe(200)
    expect((await auth.get(`/api/projects/${project.key}/cloud-sync/creation-recovery`)).status).toBe(200)
    const cloudStatus = await auth.get(`/api/projects/${project.key}/cloud-sync/status`)
    expect(cloudStatus.status).toBe(404)
    expect(cloudStatus.body).toEqual({ error: 'cloud sync is not enabled for this project' })
    const before = readFileSync(created.filePath!, 'utf8')
    const rejected = await auth.patch(`/api/projects/${project.key}/crs/${created.crCode}`).send({ status: 'In Progress', phaseEpic: 'TEST-999' })
    expect(rejected.status).toBeGreaterThanOrEqual(400)
    expect(readFileSync(created.filePath!, 'utf8')).toBe(before)
    await Promise.all([app.runtime.stop(), app.runtime.stop()])
    expect(stop).toHaveBeenCalledTimes(1)
    expect(app.runtime.state).toBe('stopped')
    expect(app.fileWatcher.listenerCount('registry-change')).toBe(0)
    expect(app.fileWatcher.watchers.size).toBe(0)
    expect(app.fileWatcher.worktreeWatchers.size).toBe(0)
    await expect(app.runtime.start()).rejects.toThrow('stopped')
  })
  it('disposes partially initialized resources when startup fails', async () => {
    const app = construct()
    const stop = jest.spyOn(app.fileWatcher, 'stop')
    jest.spyOn(app.projectDiscovery, 'getAllProjects').mockRejectedValue(new Error('injected startup failure'))
    await expect(app.runtime.start()).rejects.toThrow('injected startup failure')
    await app.runtime.stop()
    expect(app.runtime.state).toBe('stopped')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(app.fileWatcher.watchers.size).toBe(0)
    expect(app.fileWatcher.listenerCount('registry-change')).toBe(0)
  })
  it('ends established SSE clients, drains active observation and ignores late close/error callbacks', async () => {
    const app = construct()
    await app.runtime.start()
    let release!: () => void
    let finished = false
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    jest.spyOn(app.ticketService, 'observeTicketIdentities').mockImplementation(async () => {
      await pending
      finished = true
      return []
    })
    const observing = app.runtime.ticketIdentityObservation.refresh('active')
    const events = new EventEmitter()
    const end = jest.fn(() => {
      events.emit('close')
    })
    const response = { headersSent: true, write: jest.fn(), on: (event: string, callback: (...args: unknown[]) => void) => {
      events.on(event, callback)
    }, end }
    await app.fileWatcher.addClient(response, { canWrite: true, projectRefs: ['absent'] })
    let stopped = false
    const stopping = app.runtime.stop().then(() => {
      stopped = true
    })
    try {
      await new Promise(resolve => setImmediate(resolve))
      const resolvedEarly = stopped
      const endedBeforeDrain = end.mock.calls.length
      release()
      await Promise.all([observing, stopping])
      expect({ resolvedEarly, endedBeforeDrain, finished }).toEqual({ resolvedEarly: false, endedBeforeDrain: 1, finished: true })
      const schedule = jest.spyOn(globalThis, 'setTimeout')
      events.emit('close')
      events.emit('error', new Error('late close'))
      app.fileWatcher.broadcastProjectionChange('active')
      expect(schedule).not.toHaveBeenCalled()
      expect(app.fileWatcher.getClientCount()).toBe(0)
    }
    finally {
      release()
      await stopping
      await app.fileWatcher.stop()
    }
  })
  it('drains a paused document refresh and never recreates its watchers after stop', async () => {
    const project = await factory.createProject('empty', { code: 'DOC' })
    const app = construct()
    app.fileWatcher.initDocumentWatchers('DOC', project.path, ['docs'], 'docs/CRs')
    const watcher = [...app.fileWatcher.watchers.values()][0]!
    expect(watcher).toBeDefined()
    let release!: () => void
    let entered!: () => void
    const paused = new Promise<void>((resolve) => {
      entered = resolve
    })
    const resume = new Promise<void>((resolve) => {
      release = resolve
    })
    const close = watcher.close.bind(watcher)
    jest.spyOn(watcher, 'close').mockImplementation(async () => {
      await close()
      entered()
      await resume
    })
    const refreshing = app.fileWatcher.reconfigureDocumentWatchers('DOC', project.path, ['docs'], 'docs/CRs')
    await paused
    let stopped = false
    const stopping = app.runtime.stop().then(() => {
      stopped = true
    })
    try {
      await new Promise(resolve => setImmediate(resolve))
      const resolvedEarly = stopped
      release()
      await Promise.all([refreshing, stopping])
      expect(resolvedEarly).toBe(false)
      expect(app.fileWatcher.watchers.size).toBe(0)
    }
    finally {
      release()
      await Promise.all([refreshing, stopping])
    }
  })
  it.each(['catalog', 'state', 'activation'])('drains stopped rollout startup paused at %s without late acquisition', async (stage) => {
    await factory.createProject('empty', { code: 'START' })
    const app = construct(true)
    // Startup observation/catalog is separate from the rollout catalog read.
    jest.spyOn(app.runtime.ticketIdentityObservation, 'refresh').mockResolvedValue(undefined)
    let release!: () => void
    let entered!: () => void
    const resumed = new Promise<void>((resolve) => {
      release = resolve
    })
    const paused = new Promise<void>((resolve) => {
      entered = resolve
    })
    const pause = async () => {
      entered()
      await resumed
    }
    const heartbeat = jest.spyOn(app.fileWatcher, 'startHeartbeat')
    const catalog = app.projectDiscovery.getAllProjects.bind(app.projectDiscovery)
    let reads = 0
    jest.spyOn(app.projectDiscovery, 'getAllProjects').mockImplementation(async () => {
      const projects = await catalog()
      reads++
      // Registration also reads the catalog; the final read is identifiable by heartbeat.
      if (stage === 'catalog' && heartbeat.mock.calls.length > 0)
        await pause()
      return projects
    })
    const stateRead = jest.spyOn(ProjectStateStore.prototype, 'read').mockImplementation(async () => {
      if (stage === 'state')
        await pause()
      return { kind: 'enabled', connection: { version: 2, state: 'enabled', cloudProjectId: 'cloud-start', serviceOrigin: 'https://mdt-sync.example.com' } }
    })
    let streamTimer: ReturnType<typeof setInterval> | undefined
    const startStream = jest.spyOn(app.runtime.projectionStreamManager, 'start').mockImplementation(async () => {
      if (stage === 'activation')
        await pause()
      streamTimer = setInterval(() => {}, 60_000)
    })
    const stopStreams = jest.spyOn(app.runtime.projectionStreamManager, 'stopAll').mockImplementation(() => {
      clearInterval(streamTimer)
      streamTimer = undefined
    })
    jest.spyOn(app.runtime.projectionStreamManager, 'stop').mockImplementation(() => {
      clearInterval(streamTimer)
      streamTimer = undefined
    })
    const retry = jest.spyOn(CloudProjectionSync.prototype, 'startRetryRunner').mockImplementation(() => {})
    const starting = app.runtime.start()
    await paused
    let stopped = false
    const stopping = app.runtime.stop().then(() => {
      stopped = true
    })
    try {
      await new Promise(resolve => setImmediate(resolve))
      expect(stopped).toBe(false)
      release()
      await Promise.all([starting, stopping])
      expect(app.runtime.state).toBe('stopped')
      expect(streamTimer).toBeUndefined()
      expect(retry).not.toHaveBeenCalled()
      expect(startStream).toHaveBeenCalledTimes(stage === 'activation' ? 1 : 0)
      if (stage === 'catalog')
        expect(stateRead).not.toHaveBeenCalled()
      expect(stopStreams).toHaveBeenCalled()
      expect(reads).toBeGreaterThan(0)
    }
    finally {
      release()
      await Promise.all([starting, stopping])
      clearInterval(streamTimer)
    }
  })
  it('resolves project selector id/path together, preserves siblings and denies non-owners without writes', async () => {
    const first = await factory.createProject('empty', { code: 'FIRST' })
    const second = await factory.createProject('empty', { code: 'SECOND' })
    const app = construct()
    const projects = await app.projectDiscovery.getAllProjects()
    const canonical = projects.find(entry => entry.project.code === first.key)!
    const refresh = jest.spyOn(app.fileWatcher, 'reconfigureDocumentWatchers').mockResolvedValue(0)
    const auth = request.agent(app.app)
    auth.set('Authorization', 'Bearer isolated-owner')
    const firstFile = `${first.path}/.mdt-config.toml`
    const secondFile = `${second.path}/.mdt-config.toml`
    const secondBefore = readFileSync(secondFile, 'utf8')
    const saved = await auth.patch(`/api/config?projectId=${first.key}`).send({ selector: 'project.document.maxDepth', value: 7 })
    expect(saved.status).toBe(200)
    expect(readFileSync(firstFile, 'utf8')).toContain('maxDepth = 7')
    expect(readFileSync(secondFile, 'utf8')).toBe(secondBefore)
    expect(refresh).toHaveBeenCalledWith(canonical.id, first.path, expect.any(Array), expect.any(String))
    const selectors = await auth.get(`/api/config/selectors?projectId=${canonical.id}`)
    expect(selectors.status).toBe(200)
    expect(selectors.body.selectors).toEqual(expect.arrayContaining([expect.objectContaining({ selector: 'project.document.maxDepth', value: 7 })]))
    const before = readFileSync(firstFile, 'utf8')
    const denied = await request(app.app).patch(`/api/config?projectId=${first.key}`).send({ selector: 'project.document.maxDepth', value: 8 })
    expect(denied.status).toBe(403)
    const missing = await auth.patch('/api/config?projectId=missing').send({ selector: 'project.document.maxDepth', value: 8 })
    expect(missing.status).toBe(500)
    expect(missing.body).toEqual({ error: 'Failed to apply configuration change' })
    expect(readFileSync(firstFile, 'utf8')).toBe(before)
    expect(readFileSync(secondFile, 'utf8')).toBe(secondBefore)
    expect(refresh).toHaveBeenCalledTimes(1)
  })
  it('rejects malformed config query/body and document configuration before persistence', async () => {
    const project = await factory.createProject('empty', { code: 'VALID' })
    const app = construct()
    const writes = jest.spyOn(ProjectConfigService.prototype, 'mutateProjectFile')
    const documents = jest.spyOn(app.projectDiscovery, 'configureDocuments')
    const auth = request.agent(app.app)
    auth.set('Authorization', 'Bearer isolated-owner')
    const file = `${project.path}/.mdt-config.toml`
    const before = readFileSync(file, 'utf8')
    expect((await auth.patch('/api/config?projectId[]=VALID').send({ selector: 'project.document.maxDepth', value: 7 })).status).toBe(400)
    expect((await auth.patch(`/api/config?projectId=${project.key}`).send({ selector: 5, value: 7 })).status).toBe(400)
    expect((await auth.post('/api/documents/configure').send({ projectId: project.key, documentPaths: 'invalid' })).status).toBe(400)
    expect(writes).not.toHaveBeenCalled()
    expect(documents).not.toHaveBeenCalled()
    expect(readFileSync(file, 'utf8')).toBe(before)
  })
})
