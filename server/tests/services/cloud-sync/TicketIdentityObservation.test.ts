import type { TicketIdentityDiagnostic } from '@mdt/domain-contracts'
import express from 'express'
import request from 'supertest'
import { createTicketIdentityRouter } from '../../../routes/ticketIdentities.js'
import { TicketIdentityObservation } from '../../../services/cloud-sync/TicketIdentityObservation.js'

const diagnostic: TicketIdentityDiagnostic = {
  code: 'MDT-258',
  filePath: 'docs/CRs/MDT-258-manual.md',
  state: 'conflict',
  message: 'Key belongs to another creation.',
}

describe('MDT-200 bounded identity observation', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('coalesces a burst and cached reads never trigger observation', async () => {
    const observe = jest.fn().mockResolvedValue([diagnostic])
    const onChange = jest.fn()
    const manager = new TicketIdentityObservation({ observe, onChange, delayMs: 10 })
    for (let i = 0; i < 25; i++) manager.schedule('p')
    expect(observe).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(10)
    expect(observe).toHaveBeenCalledTimes(1)
    expect(manager.get('p')).toMatchObject({ projectId: 'p', state: 'ready', diagnostics: [diagnostic] })
    manager.get('p')
    manager.get('p')
    expect(observe).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    manager.stop()
  })

  it('allows one trailing scan without parallel scans or a retry loop', async () => {
    let releaseFirst: (value: TicketIdentityDiagnostic[]) => void = () => {}
    let releaseSecond: (value: TicketIdentityDiagnostic[]) => void = () => {}
    const observe = jest.fn()
      .mockImplementationOnce(() => new Promise<TicketIdentityDiagnostic[]>((resolve) => { releaseFirst = resolve }))
      .mockImplementationOnce(() => new Promise<TicketIdentityDiagnostic[]>((resolve) => { releaseSecond = resolve }))
    const manager = new TicketIdentityObservation({ observe, onChange: jest.fn(), delayMs: 10 })
    manager.schedule('p')
    await jest.advanceTimersByTimeAsync(10)
    for (let i = 0; i < 20; i++) manager.schedule('p')
    expect(observe).toHaveBeenCalledTimes(1)
    releaseFirst([diagnostic])
    await jest.advanceTimersByTimeAsync(0)
    expect(observe).toHaveBeenCalledTimes(2)
    for (let i = 0; i < 20; i++) manager.schedule('p')
    releaseSecond([diagnostic])
    await jest.advanceTimersByTimeAsync(60_000)
    expect(observe).toHaveBeenCalledTimes(2)
    manager.stop()
  })

  it('retains generic pending state after failure without exposing exception contents or automatically retrying', async () => {
    const observe = jest.fn().mockRejectedValue(new Error('/private/credential-secret: connection failed'))
    const manager = new TicketIdentityObservation({ observe, onChange: jest.fn(), delayMs: 10 })
    await manager.refresh('p')
    const cached = manager.get('p')
    expect(cached).toMatchObject({ projectId: 'p', state: 'verification_pending' })
    expect(JSON.stringify(cached)).not.toMatch(/private|credential-secret/)
    await jest.advanceTimersByTimeAsync(3_600_000)
    expect(observe).toHaveBeenCalledTimes(1)
    manager.stop()
  })

  it('returns detached cache snapshots and does not rebroadcast unchanged diagnostics', async () => {
    const observe = jest.fn().mockResolvedValue([diagnostic])
    const onChange = jest.fn()
    const manager = new TicketIdentityObservation({ observe, onChange })
    await manager.refresh('p')
    const snapshot = manager.get('p')!
    snapshot.diagnostics[0]!.message = 'changed outside cache'
    expect(manager.get('p')!.diagnostics[0]!.message).toBe(diagnostic.message)
    await manager.refresh('p')
    expect(onChange).toHaveBeenCalledTimes(1)
    manager.stop()
  })

  it('updates verification timestamps without notifying for unchanged semantic evidence', async () => {
    const first = { ...diagnostic, state: 'verified' as const, lastVerifiedAt: '2026-10-26T00:00:00.000Z', stale: false }
    const second = { ...first, lastVerifiedAt: '2026-10-26T00:00:01.000Z' }
    const observe = jest.fn().mockResolvedValueOnce([first]).mockResolvedValueOnce([second])
    const onChange = jest.fn()
    const manager = new TicketIdentityObservation({ observe, onChange })
    await manager.refresh('p')
    await manager.refresh('p')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(manager.get('p')?.diagnostics[0]).toMatchObject({ lastVerifiedAt: second.lastVerifiedAt })
    manager.stop()
  })

  it('suppresses late publication after stop and cancels queued work', async () => {
    let release: (value: TicketIdentityDiagnostic[]) => void = () => {}
    const observe = jest.fn().mockImplementation(() => new Promise<TicketIdentityDiagnostic[]>((resolve) => {
      release = resolve
    }))
    const onChange = jest.fn()
    const manager = new TicketIdentityObservation({ observe, onChange, delayMs: 10 })
    manager.schedule('p')
    await jest.advanceTimersByTimeAsync(10)
    manager.schedule('queued')
    manager.stop()
    release([diagnostic])
    await jest.advanceTimersByTimeAsync(100)
    expect(onChange).not.toHaveBeenCalled()
    manager.schedule('later')
    await jest.advanceTimersByTimeAsync(100)
    expect(observe).toHaveBeenCalledTimes(1)
  })
})

describe('MDT-200 cached identity diagnostics route', () => {
  it('requires owner access and never probes on repeated GET', async () => {
    const observe = jest.fn().mockResolvedValue([diagnostic])
    const manager = new TicketIdentityObservation({ observe, onChange: jest.fn() })
    await manager.refresh('p')
    const app = express()
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite: req.get('x-test-owner') === 'yes', mode: 'owner-admin', projectRefs: [], shareIds: [] } })
      next()
    })
    app.use('/api/projects', createTicketIdentityRouter(manager))
    await request(app).get('/api/projects/p/ticket-identities').expect(403)
    for (let i = 0; i < 2; i++) {
      const response = await request(app).get('/api/projects/p/ticket-identities').set('x-test-owner', 'yes').expect(200)
      expect(response.body.diagnostics).toEqual([diagnostic])
      expect(JSON.stringify(response.body)).not.toContain('physicalFilePath')
    }
    await request(app).get('/api/projects/unknown/ticket-identities').set('x-test-owner', 'yes').expect(404)
    expect(observe).toHaveBeenCalledTimes(1)
    manager.stop()
  })
})
