/**
 * useProjectSearch hook tests — MDT-179
 *
 * TEST-project-search-hook: Client-side project matching
 * Covering: BR-3.1, BR-3.2, BR-6.4
 */

import { describe, expect, it } from 'bun:test'
import type { Project } from '@mdt/shared/models/Project'
import { matchProjects } from '@/hooks/useProjectSearch'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProject(name: string, code: string): Project {
  return { id: `${code}-id`, project: { code, name, path: `/tmp/${code}` } } as Project
}

const PROJECTS = [
  makeProject('Task Manager', 'TMGR'),
  makeProject('Markdown Ticket', 'MDT'),
  makeProject('Summarize Link', 'SLINK'),
  makeProject('Document Engine', 'DOC'),
]

// ---------------------------------------------------------------------------
// matchProjects (pure function)
// ---------------------------------------------------------------------------

describe('matchProjects', () => {
  it('matches by word prefix (BR-3.1) — "task ma" matches "Task Manager"', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'task ma' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.project.project?.name).toBe('Task Manager')
  })

  it('matches by single word prefix — "mark" matches "Markdown Ticket"', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'mark' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.project.project?.name).toBe('Markdown Ticket')
  })

  it('matches by project code prefix (BR-3.2) — "TMG" matches TMGR', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'TMG' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.project.project?.name).toBe('Task Manager')
  })

  it('exact code match scores higher than name prefix', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'MDT' })
    expect(results.length).toBeGreaterThan(0)
    // MDT exact code match should be first
    expect(results[0]!.project.project?.code).toBe('MDT')
  })

  it('returns empty for no matches', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'xyznope' })
    expect(results).toHaveLength(0)
  })

  it('returns empty for empty query', () => {
    const results = matchProjects({ projects: PROJECTS, query: '' })
    expect(results).toHaveLength(0)
  })

  it('respects maxResults limit', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'a', maxResults: 2 })
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('AND logic: all terms must match — "task link" matches nothing', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'task link' })
    // "task" matches Task Manager, "link" matches Summarize Link, but no project matches both
    expect(results).toHaveLength(0)
  })

  it('case-insensitive matching (BR-3.2)', () => {
    const results = matchProjects({ projects: PROJECTS, query: 'tmgr' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.project.project?.code).toBe('TMGR')
  })

  it('does not block project name lookup on invalid code (BR-6.4)', () => {
    // If user types something that looks like it could be a code but isn't,
    // project name matching should still work
    const results = matchProjects({ projects: PROJECTS, query: 'doc' })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.project.project?.name).toBe('Document Engine')
  })
})
