// Isolated real application graph: no listener, cloud credentials or existing runtime.
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { TestEnvironment } from '@mdt/shared/test-lib'
const env = new TestEnvironment()
await env.setup()
writeFileSync(`${env.getConfigDirectory()}/config.toml`, '[discovery]\nautoDiscover = false\nsearchPaths = []\n')
const { createApplication } = await import('../../../../../server/app.js')
const { buildRuntimeConfig } = await import('../../../../../server/config/runtimeConfig.js')
const { ProjectService } = await import('@mdt/shared/services/ProjectService.js')
const resources = () => process.getActiveResourcesInfo().filter(type => type !== 'PipeWrap').sort()
const signals = () => ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal))
// Let tsx/import-loader IPC settle before comparing process resources.
await new Promise(resolve => setTimeout(resolve, 100))
const before = { resources: resources(), signals: signals() }
const discovery = new ProjectService(true)
const graph = createApplication({ projectDiscovery: discovery, runtimeConfig: buildRuntimeConfig({ CONFIG_DIR: env.getConfigDirectory(), NODE_ENV: 'test' }) })
const constructed = { resources: resources(), signals: signals(), watchers: graph.fileWatcher.watchers.size }
let release!: () => void
let observationFinished = false
let stopReturned = false
let ended = 0
try {
  await graph.runtime.start()
  const started = { resources: resources(), registryListeners: graph.fileWatcher.listenerCount('registry-change'), watchers: graph.fileWatcher.watchers.size }
  const pending = new Promise<void>(resolve => { release = resolve })
  graph.ticketService.observeTicketIdentities = async () => { await pending; observationFinished = true; return [] }
  const observing = graph.runtime.ticketIdentityObservation.refresh('deferred')
  const events = new EventEmitter()
  await graph.fileWatcher.addClient({ headersSent: true, write: () => true, on: (event, callback) => { events.on(event, callback) }, end: () => { ended++; events.emit('close') } }, { canWrite: true, projectRefs: ['absent'] })
  const stopping = graph.runtime.stop().then(() => { stopReturned = true })
  await new Promise(resolve => setImmediate(resolve))
  const duringStop = { stopReturned, observationFinished, ended }
  assert.deepEqual(duringStop, { stopReturned: false, observationFinished: false, ended: 1 })
  release()
  await Promise.all([observing, stopping])
  events.emit('close')
  events.emit('error', new Error('late callback'))
  graph.fileWatcher.broadcastProjectionChange('deferred')
  await new Promise(resolve => setImmediate(resolve))
  const immediateAfterStop = resources()
  // Diagnostic sampling only: stop was already awaited; this does not cancel or drain work.
  await new Promise(resolve => setTimeout(resolve, 100))
  const stopped = { resources: resources(), signals: signals(), registryListeners: graph.fileWatcher.listenerCount('registry-change'), watchers: graph.fileWatcher.watchers.size, clients: graph.fileWatcher.getClientCount(), state: graph.runtime.state, stopReturned, observationFinished, ended }
  assert.equal(stopped.state, 'stopped')
  assert.equal(stopped.clients, 0)
  assert.equal(stopped.watchers, 0)
  assert.equal(stopped.registryListeners, 0)
  assert.deepEqual(stopped.signals, before.signals)
  assert.deepEqual(stopped.resources, before.resources)
  console.log(JSON.stringify({ before, constructed, started, duringStop, immediateAfterStop, stopped }, null, 2))
}
finally {
  release?.()
  await graph.runtime.stop()
  await env.cleanup()
}
