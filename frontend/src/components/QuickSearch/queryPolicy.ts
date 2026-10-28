import type { SearchScopeValue } from '@mdt/domain-contracts'
import type { QueryParts } from '@/hooks/useQuickSearch'
import { SearchScope, TICKET_KEY_INPUT_PATTERN } from '@mdt/domain-contracts'
import { parseQueryParts } from '@/hooks/useQuickSearch'

/** Entity type and project location are independent; only explicit syntax overrides location. */
export function resolveQuickSearchQuery(query: string, scope: SearchScopeValue, currentProjectCode: string | undefined, allProjects: boolean): QueryParts {
  const text = query.trim()
  if (scope === SearchScope.PROJECTS)
    return { mode: 'projects_only', searchText: text }
  const explicit = parseQueryParts(text)
  if (explicit.mode === 'project_scope' || TICKET_KEY_INPUT_PATTERN.test(text))
    return explicit
  if (allProjects || !currentProjectCode)
    return { mode: 'ticket_key', ticketCode: text, searchText: text }
  return { mode: 'current_project', projectCode: currentProjectCode, searchText: text }
}
