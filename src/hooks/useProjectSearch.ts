/**
 * useProjectSearch - Client-side project matching — MDT-179
 *
 * Matches projects by name (word-prefix) and code (case-insensitive prefix).
 * Uses the projects list already loaded by the parent component.
 */

import type { Project } from '@mdt/shared/models/Project'

import { useCallback, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Pure matching functions (exported for testing)
// ---------------------------------------------------------------------------

export interface ProjectMatchOptions {
  projects: Project[]
  query: string
  maxResults?: number
}

export interface ScoredProject {
  project: Project
  score: number
}

/**
 * Score a single query term against a project.
 * Returns 0 if no match.
 */
function scoreTerm(term: string, project: Project): number {
  const name = project.project?.name?.toLowerCase() ?? ''
  const code = project.project?.code?.toLowerCase() ?? ''
  const t = term.toLowerCase()

  // Exact code match
  if (code === t) return 100

  // Code prefix match (e.g., "tm" matches "TMGR")
  if (code.startsWith(t)) return 90

  // Word-prefix match in name
  const words = name.split(/[^a-z0-9]+/).filter(Boolean)
  for (const word of words) {
    if (word === t) return 80 // exact word match
    if (word.startsWith(t)) return 70 // word prefix match (e.g., "task" matches "Task Manager")
  }

  return 0
}

/**
 * Filter and score projects matching a query.
 * Each whitespace-delimited term must match at least one field (AND logic).
 */
export function matchProjects(options: ProjectMatchOptions): ScoredProject[] {
  const { projects, query, maxResults = 10 } = options

  if (!query.trim()) return []

  const terms = query.toLowerCase().trim().split(/\s+/)

  const matches = projects
    .map((project) => {
      let score = 0
      for (const term of terms) {
        const termScore = scoreTerm(term, project)
        if (termScore === 0) return null
        score += termScore
      }
      return { project, score }
    })
    .filter((m): m is ScoredProject => m !== null)
    .sort((a, b) => b.score - a.score)

  return matches.slice(0, maxResults)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseProjectSearchOptions {
  projects: Project[]
  query: string
  maxResults?: number
}

export interface UseProjectSearchResult {
  matches: ScoredProject[]
  isEmpty: boolean
}

/**
 * Hook for client-side project matching.
 * Returns scored project matches for the given query.
 */
export function useProjectSearch(options: UseProjectSearchOptions): UseProjectSearchResult {
  const { projects, query, maxResults } = options

  const matches = useMemo(
    () => matchProjects({ projects, query, maxResults }),
    [projects, query, maxResults],
  )

  const isEmpty = query.trim().length > 0 && matches.length === 0

  return { matches, isEmpty }
}
