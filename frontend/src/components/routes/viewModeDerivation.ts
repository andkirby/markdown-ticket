/**
 * Pure view-mode routing derivations for the project route handler.
 *
 * Extracted verbatim from App.tsx (stage 0 of the controlled refactor —
 * see .refactoring/runs/20260828T163524Z-app-tsx/plan.md). Behavior-identical
 * to the inline logic they replace; characterized by viewModeDerivation.test.ts.
 */

/** The three top-level views of a project route. */
export type AppViewMode = 'board' | 'list' | 'documents'

/**
 * Determine the current view mode from the URL.
 *
 * Checks pathname first (for /prj/MDT/list, /prj/MDT/epics, /prj/MDT/documents).
 * /epics is a board-layout variant (swimlanes), so it still reports 'board'
 * as the view; the board-layout derivation reads the /epics segment separately.
 * Falls back to the query param when on a ticket route
 * (e.g., /prj/MDT/ticket/MDT-130?view=list), then to 'board'.
 */
export function deriveViewMode(pathname: string, viewParam: string | null): AppViewMode {
  if (pathname.includes('/list'))
    return 'list'
  if (pathname.includes('/documents'))
    return 'documents'
  if (viewParam === 'list' || viewParam === 'documents' || viewParam === 'epics')
    return viewParam === 'epics' ? 'board' : viewParam
  return 'board'
}

/**
 * Map the carried ?view= context to the path the ticket modal returns to.
 * viewContext 'epics' maps to the /epics route; 'board' maps to the bare
 * project path; others map directly.
 */
export function ticketCloseTargetPath(viewContext: string, basePath: string): string {
  if (viewContext === 'board')
    return basePath
  if (viewContext === 'epics')
    return `${basePath}/epics`
  return `${basePath}/${viewContext}`
}

/**
 * MDT-246 (BR-1.7): the inverse of ticketCloseTargetPath — attach the current
 * `?view=` context to a ticket-link href when the link is opened from inside a
 * ticket modal, so closing the opened ticket returns to the originating view.
 * The inverse pairing with ticketCloseTargetPath is why this rule lives here.
 *
 * Outside ticket routes, without a `?view=`, or on hrefs that already carry a
 * query, the href passes through untouched. The param is inserted before any
 * `#fragment` — appending after it would place the query inside the hash.
 */
export function carryViewParam(href: string, pathname: string, search: string): string {
  if (!href || !pathname.includes('/ticket/'))
    return href
  const view = new URLSearchParams(search).get('view')
  if (!view)
    return href
  const hashIndex = href.indexOf('#')
  const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex)
  if (beforeHash.includes('?'))
    return href
  return `${beforeHash}?view=${encodeURIComponent(view)}${hash}`
}
