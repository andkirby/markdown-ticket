/**
 * MDT-248 — display helpers for pane document paths.
 *
 * Separate module (not TicketSidePane.tsx) so non-component consumers — the
 * session pill host, the persisted-session store tests — can share them
 * (react-refresh/only-export-components bans mixed exports in component files).
 */

/** "docs/some-dir/deep-dive.md" → "Deep Dive" — title fallback when no parsed H1 is known. */
export function humanizePaneTitle(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
}
