# UAT: MDT-248

## Round 1 — 2026-09-23

**Feedback** (user, live use of the split mode):

1. "It sits in a small window" — the split modal kept document-mode whitespace (10dvh top anchor, 2rem card margins) and capped height accordingly, so the working surface felt cramped.
2. "When I scroll, tabs bar is fixed" — the whole ticket column was one scroll container: the title scrolled away, the translucent sticky tabs floated mid-view, and chrome felt unstable.
3. "X button just appears over…" — the card-absolute close × kept its fixed position while content scrolled under it, so it ended up hovering over prose once the header had scrolled away.

**Root cause**: split mode had kept the chrome model of the free-growing document modal (absolute ×, sticky tabs, tall anchor) while switching to internal scrolling — the two were mismatched.

**Fix** (`fix(MDT-248): split mode as pinned-chrome work surface`):

- Split mode is an app panel: ticket-column header + sub-document tabs are pinned; only the content region below the tabs scrolls (`.subdoc-content` is the scroller). The × now always sits over the pinned title bar.
- Frame reclaims height while split: container top anchor 10dvh → 3dvh, card margins `sm:my-8` → 0.5rem, body cap `calc(100dvh - 3dvh - 2.5rem)`.
- Scroll transfer retargeted to the content region and captured at click time (the pane-header focus effect scrolls the overlay before a parent effect could read the offset — found by the strengthened E2E).

**Verification**:

- E2E `side-doc-pane.spec.ts` 9/9 — BR-1.1 now locks the new contract: pre-split offset transfers into the content scroller, and after a deep scroll the title + tabs stay visible with the × above the tabs band.
- `bun run validate:ts`, `bun run build`, `bun run lint:frontend`, TV unit suites — green.

**Status**: round 1 addressed; awaiting next look.

## Round 2 — 2026-09-23

**Feedback**: "stretch to top/bottom, add a handle to change wall position for reasonable range."

**Fix** (`fix(MDT-248): stretch split frame + draggable column divider (UAT r2)`):

- The split body now has a fixed height `calc(100dvh - 1.5rem)` with a thin frame — a work surface that fills the viewport vertically regardless of content length (content scrolls inside each column).
- New `SplitDivider` between the columns: pointer drag, ArrowLeft/ArrowRight ±32px, double-click reset; range keeps both columns ≥ 340px (`clampTicketColumnWidth`, `splitLayout.ts`). Session-local width.
- The modal × tracks the dragged width via the `--ticket-col-width` CSS var; the pane's own border moved into the divider (1px rule with hover/focus/drag accent).

**Verification**: unit 18/18 (clamp + divider drag/keyboard); E2E 10/10 (new `divider_resizes_columns_within_range` locks drag, clamp, reset, keyboard, and the vertical stretch); TS/build/lint green.

**Status**: round 2 addressed; awaiting next look.

## Round 3 — 2026-09-23

**Feedback**: "use the same head block style on the doc side"; persist the divider position in localStorage ("find related documents and see how it can be done").

**Fix** (`fix(MDT-248): pane head block + persisted split wall (UAT r3)`):

- Pane header is now the same two-row head block as the ticket column: title bar (`px-4 py-3`, `modal__headline` typography, 32px action controls — hand-off + ×) over a meta bar (`py-2.5`: back/forward + mono path). Replaces the single-row toolbar.
- Wall position persisted as a **percent** of the split body width — `mdt-settings-ticket-side-pane-split-ratio` (config/sidePaneLayout.ts, following the settingsPreferences `mdt-settings-*` conventions). Percent chosen over px: a percent flex-basis resolves live (no restore race with the modal width transition) and keeps the wall's relative position across viewport sizes. Committed on drag end and arrow nudge; double-click reset clears storage; restored when the pane first shows in a later modal. CSS `min-width: 340px` guard holds the readable floor when the window shrinks under a stored position.

**Verification**: unit green across pane + config suites (new sidePaneLayout round-trip/reject tests); E2E 10/10 — the divider journey now closes and reopens the modal and asserts the wall returns to the dragged position with the key present in localStorage; TS/build/lint green.

**Status**: round 3 addressed; awaiting next look.
