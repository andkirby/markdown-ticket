# UAT Refinement Brief — MDT-221 (Round 3)

## Objective

Add a fullscreen mode to the HTML preview so wide/large `.html` documents
become readable at full viewport size, in both surfaces (Documents View and
ticket view), with the same UX as the mermaid fullscreen overlay.

## Investigation — chosen approach

**Chosen: CSS-repositioning overlay on the EXISTING wrapper** (React state +
`html-sandbox-viewer--fullscreen` modifier class), mirroring the mermaid
overlay contract (`frontend/src/utils/mermaid/fullscreen.ts`).

- The iframe DOM node is never moved or recreated → no reload, no re-mint;
  the loaded preview and its token are undisturbed (C-2.27). Browsers reload
  an iframe on DOM move, so any portal/modal approach is disqualified by the
  token-TTL constraint alone.
- Escape is captured in the capture phase with `stopImmediatePropagation`,
  exactly like mermaid — this is what keeps the ticket modal's own
  bubble-phase Escape close (ui/Modal.tsx) from also firing.
- No scaling logic (unlike mermaid's adaptive SVG scaling): an iframe just
  fills 100%/100%.

**Rejected alternatives**:

1. **React-level `.modal--viewport` / portal** (TraceGraphShell pattern) —
   rendering the preview inside a new modal tree re-parents or recreates the
   iframe → forced reload → re-mint; long fullscreen sessions would break on
   their own. Also stacks a second Escape/focus management layer on the
   ticket modal.
2. **Native Fullscreen API** (`element.requestFullscreen()`) — also
   remount-free, but hides browser chrome (different UX from mermaid), needs
   vendor prefixes + `:fullscreen` styling anyway, exits on tab switch, and
   is flaky in headless E2E. Rejected for UX consistency with the requested
   mermaid parity.

## Approved Changes

1. **BR-1.16 added** — fullscreen control on the HTML preview in both
   surfaces; entering overlays the whole viewport above app chrome and the
   ticket modal; Escape or the control exits.
2. **C-2.27 added** — the fullscreen transition never remounts/reloads the
   iframe and never issues a mint (iframe node identity, src, and sandbox
   unchanged across the toggle).

## Changed Requirement IDs

| ID | Action | Why |
|---|---|---|
| BR-1.16 | additive | New capability: fullscreen reading mode |
| C-2.27 | additive | New constraint: no remount / no re-mint on toggle |

## Affected Downstream Trace

- **requirements**: BR-1.16, C-2.27 added
- **bdd**: `html_preview_fullscreen_overlay` added
- **architecture**: ART-25 (documents-view.css) added; OBL-25 added
- **tests**: TEST-html-fullscreen-toggle (unit), TEST-e2e-html-fullscreen (e2e)
- **tasks**: TASK-19 (single execution slice, below)

## Execution Slices

### Slice 1 — Fullscreen overlay in HtmlSandboxViewer (TASK-19)

- **Objective**: viewport-covering fullscreen with Escape exit, no remount.
- **Direct artifacts/files**:
  - `frontend/src/components/DocumentsView/HtmlSandboxViewer.tsx` —
    `isFullscreen` state; capture-phase Escape keydown with
    `stopImmediatePropagation`; body-overflow lock with guarded restore
    (only unlocks what the overlay locked — the ticket modal's own lock is
    never clobbered, in either cleanup order); floating expand/collapse
    button (lucide Maximize/Minimize, `aria-pressed`, title swap).
  - `frontend/src/components/DocumentsView/documents-view.css` —
    `.html-sandbox-viewer--fullscreen` (fixed inset-0, z-9999 above the
    modal layer's z-50, canvas-token backdrop) and
    `.html-sandbox-viewer__fullscreen-btn` (h-9 floating control,
    state-ramp hover, `:focus-visible` ring-1/50).
  - `frontend/src/components/DocumentsView/HtmlSandboxViewer.test.tsx` —
    fullscreen describe block (5 tests).
  - `tests/e2e/documents/html-preview.spec.ts` + `tests/e2e/utils/selectors.ts`
    — E2E: viewport-sized box, in-frame marker survives toggle (no reload),
    Escape restores panel size.
- **Direct GREEN targets**: TEST-html-fullscreen-toggle,
  TEST-e2e-html-fullscreen.
- **Impacted canonical task IDs**: TASK-19.

## Security Posture (what does NOT change)

- iframe `sandbox="allow-scripts"` hardcoded, never `allow-same-origin`;
  the "NEVER includes allow-same-origin" unit test stays as the guard and
  still passes untouched.
- Fullscreen is pure CSS class toggling on a wrapper: iframe src, mint flow,
  CSP, and the raw-preview route are not touched; no extra mint request is
  issued for the transition (asserted in unit + E2E).
- Escape capture with `stopImmediatePropagation` only intercepts the key
  while fullscreen is active; the ticket modal's close behavior is otherwise
  unchanged (E2E-verified live: first Escape exits fullscreen only, second
  closes the modal).

## Validation

- `spec-trace validate MDT-221 --stage all` — PASS (all 5 stages, r3).
- `bun test frontend/src/components/DocumentsView` — 42/42 pass.
- `bun run test:e2e -- tests/e2e/documents/html-preview.spec.ts` — 4/4 pass.
- `bun run validate:ts` (changed files) + `eslint` on the two changed
  frontend files — clean; `scripts/parse-css.mjs` on documents-view.css —
  clean; JSX uses semantic classes only (enforce-semantic-classes safe).
- Live throwaway stack (BACKEND_PORT=3005 + vite 3076, user servers
  untouched): Documents View `designs/board-zai/design3.html` and ticket
  view `GPDE-012/diagrams/coverage-dataflow.html` — fullscreen box exactly
  the 1440x900 viewport, z-index 9999/fixed, no frame reload (in-frame
  marker survives), Escape exits; in the ticket view the first Escape only
  exits fullscreen (modal stays open), the second closes the modal; body
  scroll lock fully released afterwards.

## Watchlist

- **Pre-existing TicketViewer directory test failures** — running the whole
  `frontend/src/components/TicketViewer` directory under one bun process
  fails 19 hook tests (useTicketDocumentNavigation/useTicketDocumentRealtime);
  the same files pass in isolation, and the failures persist with this
  round's changes fully stashed → pre-existing in the in-flight worktree
  state, unrelated to MDT-221 r3. Not caused or fixed here.
- **SSE refresh while fullscreen** — an external edit (refreshToken bump)
  remounts the iframe by design (fresh token) inside the fullscreen
  overlay; fullscreen itself persists. Expected behavior.

## Open Decisions

None.
