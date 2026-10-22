/**
 * TEST-read-model-merge — covers C-2, C-6, BR-1.9.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local projection read model.
 *
 * Verifies the CloudProjectionReadModel:
 *   - local-wins merge (BR-1.9);
 *   - duplicate/old revision ignored (C-6);
 *   - sparse catch-up accepted, live gap detection (Edge-2);
 *   - atomic read-model/cursor persistence before acknowledgement (C-6);
 *   - tombstone removal.
 */

import type { ProjectedHeader } from '@mdt/domain-contracts'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { CloudProjectionReadModel } from '../CloudProjectionReadModel'

const PROJECT_ID = 'local-project'
const CLOUD_PROJECT_ID = 'cloud-uuid-1'

function header(code: string): ProjectedHeader {
  return {
    code,
    title: `Title ${code}`,
    status: 'In Progress',
    type: 'Feature Enhancement',
    priority: 'High',
    assignee: null,
    date_created: '2026-08-08T00:00:00Z',
    last_modified: '2026-08-08T00:00:00Z',
  }
}

describe('CloudProjectionReadModel (TEST-read-model-merge: C-2, C-6, BR-1.9)', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-read-model-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('applies a delta and advances the cursor', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    const changed = await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    expect(changed).toBe(true)
    expect(model.appliedCursor).toBe(5)
  })

  it('ignores duplicate or older revisions during live delivery (C-6)', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    // An older/duplicate revision is ignored.
    const changed = await model.applyPersistNotify({
      projectRevision: 4,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    expect(changed).toBe(false)
  })

  it('local-wins merge suppresses same-number projections (BR-1.9)', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    const view = model.unifiedView(new Set(['MDT-1']))
    expect(view).toEqual([])
  })

  it('projection-only entries appear in the unified view (read-only)', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 2,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-2'),
    })
    const view = model.unifiedView(new Set(['MDT-1']))
    expect(view).toHaveLength(1)
    expect(view[0]!.header.code).toBe('MDT-2')
  })

  it('detects a live gap requiring catch-up (Edge-2)', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    model.advanceCursor(5)
    // Revision 7 when appliedCursor is 5 → gap (6 missing).
    expect(model.isLiveGap(7)).toBe(true)
    expect(model.isLiveGap(6)).toBe(false)
  })

  it('accepts sparse catch-up revisions and advances to the high-water cursor', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    // Sparse: revisions 1, 3, 7 (2,4,5,6 missing) applied during catch-up.
    expect(model.applyDelta(1, 10, 1, 'active', header('MDT-10'))).toBe(true)
    expect(model.applyDelta(3, 11, 1, 'active', header('MDT-11'))).toBe(true)
    expect(model.applyDelta(7, 12, 1, 'active', header('MDT-12'))).toBe(true)
    model.advanceCursor(7)
    expect(model.appliedCursor).toBe(7)
    expect(model.live).toBe(true)
  })

  it('removes a tombstoned entry', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    await model.applyPersistNotify({
      projectRevision: 6,
      ticketNumber: 1,
      projectionVersion: 2,
      lifecycle: 'deleted',
      header: header('MDT-1'),
    })
    expect(model.entries()).toEqual([])
  })

  it('persists cursor + state atomically and reloads it', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    const reloaded = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await reloaded.load(CLOUD_PROJECT_ID)
    expect(reloaded.appliedCursor).toBe(5)
    expect(reloaded.entries()).toHaveLength(1)
  })

  it('marks stale without losing entries', async () => {
    const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
    await model.load(CLOUD_PROJECT_ID)
    await model.applyPersistNotify({
      projectRevision: 5,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: header('MDT-1'),
    })
    model.markStale()
    expect(model.live).toBe(false)
    expect(model.entries()).toHaveLength(1)
  })
})

describe('MDT-258 persisted projection cache boundary', () => {
  it.each(['{broken', 'null', '{"entries":{"1":{"header":false}}}', '{"cloudProjectId":"different","entries":{}}'])('rebuilds corrupt cache without rewriting: %s', async (text) => {
    const { mkdir, writeFile, readFile } = await import('node:fs/promises')
    const root = await mkdtemp(join(tmpdir(), 'mdt-read-corrupt-'))
    try {
      const dir = join(root, 'projects', PROJECT_ID)
      const file = join(dir, 'projection-read-model.json')
      await mkdir(dir, { recursive: true })
      await writeFile(file, text)
      const model = new CloudProjectionReadModel({ rootDir: root, localProjectId: PROJECT_ID })
      await model.load(CLOUD_PROJECT_ID)
      expect(model.entries()).toEqual([])
      expect(model.appliedCursor).toBe(0)
      expect(model.live).toBe(false)
      expect(await readFile(file, 'utf8')).toBe(text)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
