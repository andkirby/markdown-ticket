import { useCallback, useState } from 'react'

/**
 * MDT-248 — the side reading pane's session state machine.
 *
 * One session per ticket-modal lifetime: a browser-tab history of document
 * paths, a per-entry scroll map, last-known titles (for the pill and the
 * history menu without refetching), and a visible flag. States:
 * closed (no session) / open (visible) / hidden (session kept, pill showing).
 * Esc never discards; only `discard()` does. A modal close keeps a per-ticket
 * snapshot (config/sidePaneSessions.ts) that `restore()` brings back hidden.
 */
export interface SidePaneSession {
  hist: string[]
  hi: number
  scrolls: Record<string, number>
  titles: Record<string, string>
  visible: boolean
}

/** Persistable session slice — everything except live visibility. */
export interface SidePaneSessionSnapshot {
  hist: string[]
  hi: number
  scrolls: Record<string, number>
  titles: Record<string, string>
}

const EMPTY_SESSION: SidePaneSession = { hist: [], hi: -1, scrolls: {}, titles: {}, visible: false }

export function useSidePane() {
  const [session, setSession] = useState<SidePaneSession>(EMPTY_SESSION)

  const currentPath = session.hi >= 0 ? session.hist[session.hi] ?? null : null
  const hasSession = session.hi >= 0
  const paneVisible = session.visible && hasSession
  const canBack = session.hi > 0
  const canFwd = session.hi >= 0 && session.hi < session.hist.length - 1

  /**
   * Reveal the pane on `filePath`, pushing onto the history (browser-tab
   *  model: consecutive duplicates are not pushed, a new visit truncates the
   *  forward stack). Called from any state — closed, hidden, or open.
   */
  const openDocument = useCallback((filePath: string) => {
    setSession((s) => {
      const current = s.hi >= 0 ? s.hist[s.hi] : undefined
      if (current === filePath) {
        return { ...s, visible: true }
      }
      const hist = [...s.hist.slice(0, s.hi + 1), filePath]
      return { ...s, hist, hi: hist.length - 1, visible: true }
    })
  }, [])

  /**
   * Persist the pane's current scroll offset for its current entry. Called
   *  by the pane at navigation boundaries, never per scroll event.
   */
  const captureScroll = useCallback((top: number) => {
    setSession((s) => {
      const path = s.hi >= 0 ? s.hist[s.hi] : undefined
      if (!path)
        return s
      return { ...s, scrolls: { ...s.scrolls, [path]: top } }
    })
  }, [])

  /** Remember a document's parsed title (pill + history menu without refetch). */
  const recordTitle = useCallback((path: string, title: string) => {
    setSession((s) => {
      if (!path || s.titles[path] === title)
        return s
      return { ...s, titles: { ...s.titles, [path]: title } }
    })
  }, [])

  const back = useCallback(() => {
    setSession(s => (s.hi > 0 ? { ...s, hi: s.hi - 1 } : s))
  }, [])

  const fwd = useCallback(() => {
    setSession(s => (s.hi < s.hist.length - 1 ? { ...s, hi: s.hi + 1 } : s))
  }, [])

  /** Jump to a history index (history-menu navigation); the stack is kept intact. */
  const jumpTo = useCallback((index: number) => {
    setSession((s) => {
      if (index < 0 || index > s.hist.length - 1 || index === s.hi)
        return s
      return { ...s, hi: index }
    })
  }, [])

  const hide = useCallback(() => {
    setSession(s => ({ ...s, visible: false }))
  }, [])

  const reveal = useCallback(() => {
    setSession(s => ({ ...s, visible: true }))
  }, [])

  /** Bring back a persisted snapshot as hidden (the pill is the reveal affordance). */
  const restore = useCallback((snapshot: SidePaneSessionSnapshot) => {
    setSession({
      hist: snapshot.hist,
      hi: snapshot.hi,
      scrolls: snapshot.scrolls,
      titles: snapshot.titles,
      visible: false,
    })
  }, [])

  const discard = useCallback(() => {
    setSession(EMPTY_SESSION)
  }, [])

  return {
    state: session,
    currentPath,
    hasSession,
    paneVisible,
    canBack,
    canFwd,
    openDocument,
    captureScroll,
    recordTitle,
    back,
    fwd,
    jumpTo,
    hide,
    reveal,
    restore,
    discard,
  }
}

export type SidePaneApi = ReturnType<typeof useSidePane>
