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
