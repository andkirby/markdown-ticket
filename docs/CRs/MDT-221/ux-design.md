# MDT-221 — UX Design

> Pipeline UX-milestone artifact. NOT a spec-trace stage (canonical stages are
> requirements → bdd → architecture → tests → tasks → bundle). This document
> captures the viewer interaction model the spec-trace store does not own.

## Scope

UX surface for this ticket is narrow and surgical:
- One new inline viewer (`HtmlSandboxViewer`) in the Documents View right pane.
- One file-tree icon distinction (HTML vs generic file).
- One new "unsupported kind" placeholder state.

No modals, no new navigation, no settings UI. The viewer is inline (Pattern:
not a modal — see `frontend/src/MODALS.md`). Existing `document-viewer__*` layout classes
are reused so the HTML viewer is visually consistent with `MarkdownViewer`.

## Viewer state machine

`HtmlSandboxViewer` models the same prop shape as `MarkdownViewer`
(`{projectId, filePath, fileInfo, refreshToken, fileDeleted, updateState}`) and
renders one of six states. States are mutually exclusive; the first matching
condition wins.

```text
                    ┌─────────────────────────────────────┐
                    │  file / filePath changes            │
                    └──────────────────┬──────────────────┘
                                       ▼
                          ┌────────────────────────┐
              ┌─── no ────│  fileDeleted?          │──── yes ───┐
              │           └────────────────────────┘            ▼
              ▼                                    ┌──────────────────┐
   ┌────────────────────────┐                     │  DELETED         │
   │  (enter) minting-token │                     │  "File was       │
   │  POST /preview-token   │                     │   deleted"       │
   └───────────┬────────────┘                     │  (reuse          │
               │                                  │   MarkdownViewer │
        ┌──────┴───────┐                          │   deleted block) │
        ▼              ▼                          └──────────────────┘
   ┌─────────┐    ┌───────────┐
   │ 200 OK  │    │ 401/403/  │
   │ token   │    │ 5xx / net │
   └────┬────┘    └─────┬─────┘
        │               ▼
        │         ┌──────────────────┐
        │         │  TOKEN-FAILED    │
        │         │  "Preview        │
        │         │   unavailable"   │
        │         │  (no fallback    │
        │         │   to markdown)   │
        │         └──────────────────┘
        ▼
   ┌──────────────────┐    refreshToken changes    ┌──────────────────┐
   │  PREVIEW-READY   │ ─────────────────────────► │  SYNCING         │
   │  <iframe>        │                            │  (transient;     │
   │  sandbox=        │ ◄───────────────────────── │   remint +       │
   │   allow-scripts  │   remint complete          │   reload iframe) │
   └──────────────────┘                            └──────────────────┘
```

| State | Trigger | Rendered content | `data-testid` |
|---|---|---|---|
| `minting-token` | file selected, POST in flight | "Loading preview…" center message | `file-viewer` (loading) |
| `preview-ready` | POST 200, token received | `<iframe>` with token URL src | `file-viewer` + iframe |
| `token-failed` | POST non-2xx or network error | "Preview unavailable" center message; **no markdown fallback** | `file-viewer` (error) |
| `syncing` | `refreshToken` bumped (SSE edit) | iframe with new token + `updateState` badge | `file-viewer` + iframe |
| `deleted` | `fileDeleted === true` or 404 | "File was deleted" (reuse MarkdownViewer's deleted block) | `file-viewer` (deleted) |
| `unsupported-kind` | (rendered by `DocumentsLayout`, not this viewer) | "Preview not available for this file type" | `unsupported-viewer` |

## Fullscreen mode (r3, BR-1.16)

Fullscreen is an overlay property of the `preview-ready` render, orthogonal
to the state machine above — it never changes which state is active or
re-runs the mint.

**Control.** A floating icon-only button (`.html-sandbox-viewer__fullscreen-btn`)
pins to the top-right corner of the preview, over the iframe: `h-9` square,
`Maximize` icon → `Minimize` on toggle, state-ramp hover, keyboard-only
`:focus-visible` ring (ring-1 @50%). `aria-pressed` carries the state;
`aria-label`/title swap between "Enter fullscreen" and "Exit fullscreen".

**Fullscreen render.** The SAME `.html-sandbox-viewer` wrapper gains the
`--fullscreen` modifier class: `position: fixed; inset: 0; z-index: 9999`
(above the modal layer's z-50, so it covers the whole viewport inside the
ticket-view modal too), opaque canvas-token backdrop. The iframe just fills
100%/100% — unlike the mermaid overlay there is no scaling logic, because an
HTML document reflows on its own.

**Why CSS-repositioning and not a portal/modal or the native Fullscreen
API** — the contract is that toggling must not disturb the loaded preview
(C-2.27): browsers reload an iframe when it is moved in the DOM, so a
React-portal/modal approach would force a re-mint and long fullscreen
sessions would die against the ≤5 min token TTL on their own. The native
Fullscreen API is remount-free but hides browser chrome and exits on tab
switch — not the requested mermaid-parity UX.

**Exit affordances.** The button (still visible top-right) and `Escape`.
Escape is handled in the capture phase with `stopImmediatePropagation`, so
in the ticket view the first Escape exits fullscreen only — the modal's own
Escape close never fires alongside it (verified live: second Escape closes
the modal). While fullscreen, the body scroll is locked; the lock restores
guarded, so the ticket modal's own lock is never clobbered.

**Deliberately NOT done.** No focus trap: the overlay matches the mermaid
fullscreen precedent — background chrome is visually covered and Escape
always exits; adding a modal-grade focus trap is out of parity scope. No
keyboard shortcut other than Escape while fullscreen.

## The hard invariant — `sandbox` is not a prop

`HtmlSandboxViewer` hardcodes the iframe `sandbox="allow-scripts"` attribute.
The component does NOT accept a `sandbox` prop. This is the security contract
(C-2.6, Edge-3.6): `allow-same-origin` must never appear, and the only way to
guarantee that across all call sites is to make it un-overridable.

```tsx
// HtmlSandboxViewer.tsx — the invariant, encoded in JSX
<iframe
  src={previewUrl}
  sandbox="allow-scripts"           // hardcoded; no prop, no spread
  referrerPolicy="no-referrer"
  loading="lazy"
  title="Document preview"
  className="html-sandbox-viewer__frame"
/>
```

The unit test (`HtmlSandboxViewer.test.tsx`) asserts
`iframe.getAttribute('sandbox')` does not contain `allow-same-origin`. If a
future change adds the token, the test fails. Comments rot; tests don't.

## Unsupported-kind placeholder

`DocumentsLayout` renders this when `selectedDocument?.kind` is neither
`'markdown'` nor `'html'` (i.e. server did not classify the file). Reuse the
`document-viewer__center` layout classes from `MarkdownViewer`:

```text
┌─────────────────────────────────────────┐
│                                         │
│            [ FileX icon ]               │
│                                         │
│      Preview not available              │
│      for this file type.                │
│                                         │
└─────────────────────────────────────────┘
```

No call to `MarkdownViewer`. No attempt to render. (BR-1.10.)

## File-tree icon distinction

`FileTree.tsx:208-223` currently renders a generic `File` icon for every file.
Add a branch on `file.kind`:

| `file.kind` | Icon (lucide-react) | Rationale |
|---|---|---|
| `'markdown'` | `File` (existing) | Markdown is the default; keep current icon |
| `'html'` | `FileCode` | HTML is executable; the code icon signals "this runs" |
| `undefined` | `File` (existing) | Unknown files keep the generic icon |

The icon is a visual affordance, not a security boundary. The `kind` value on
the node is server-owned (OBL-1); the icon is pure presentation derived from it.

## What this UX deliberately does NOT do

- **No "open in new tab" button.** Out of scope (CR §1 out-of-scope: "Open
  original in a new browser tab only" was rejected). The preview is in-pane.
- **No editing affordance.** HTML preview is read-only (CR §1 out-of-scope).
- **No per-file sandbox controls.** The user cannot relax `sandbox`. Ever.
- **No loading spinner chrome around the iframe.** The browser's own load
  indicator is sufficient; adding a spinner fights the iframe's own rendering.
- **No filename tabs for HTML siblings.** `documentFilenameTabModel` stays
  markdown-only (BR-1.11). `index.html` + `index.print.html` do not get tabs.

## Accessibility

- The iframe has `title="Document preview"` for screen readers (WCAG 2.4.1).
- The unsupported placeholder and error/deleted states use the same heading
  hierarchy as `MarkdownViewer`'s equivalent states.
- No focus trap in the panel view (inline viewer, not a modal). The
  fullscreen overlay also ships without a focus trap — deliberate mermaid
  parity (background is covered, Escape always exits); see "Fullscreen
  mode".
- The fullscreen control is keyboard-operable with a visible `:focus-visible`
  state and announces its state via `aria-pressed`.
