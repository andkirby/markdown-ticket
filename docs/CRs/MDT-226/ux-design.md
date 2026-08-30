# UX Design: MDT-226 — Push delivery browser states

Pipeline stage: UX (mdt-pipeline-e2e). This is a focused state-rendering spec,
not a board redesign. It reuses existing patterns: `CloudProjectionStub.tsx`,
`TicketCard` Tailwind idioms, and the compact chip form of
`AuthStatusAction.tsx`. See `frontend/src/MODALS.md` for overlay conventions (not used
here — these are inline board states, not modals).

## Why a gate

The browser must distinguish projected, read-only, stale, and
authentication_required states without receiving cloud transport state
(`C-11`). The board already renders projected stubs (`CloudProjectionStub`),
but the current pipeline only exposes a binary `stale` boolean that `Board.tsx`
discards. Push delivery moves the connection lifecycle to the backend, so the
browser needs a small, honest capability view: what kind of ticket this is, and
whether the cloud state behind it is current. The view must never imply
ownership, presence, or collaboration that the system does not provide.

## Capability model (from the unified ticket view)

The backend exposes one unified ticket read model. Each item carries capability
metadata only — no `projectRevision`, `projectionVersion`, catch-up, cursor,
cloud URL, or credential (`C-11`, `ART-ticket-view-contract`). The browser
renders from two fields:

- `kind`: `canonical` (local Markdown) or `projected` (cloud-derived header
  only).
- `readOnly`: a projected item is always read-only; a canonical local ticket is
  editable as today.
- `stale`: the cloud state behind this item (or the whole project stream) is
  not currently live.

A separate project-level **sync-status** signal
(`connecting | live | stale | authentication_required`) is delivered as an
ordinary SSE/local event and carries no projection protocol detail.

## States to render

### 1. Projected ticket (cloud-derived, read-only)

- **Trigger:** `kind === 'projected'` and the project stream is `live`.
- **Render:** reuse `CloudProjectionStub` — dashed border
  (`ticket-card--projected`), `Cloud` glyph beside the ticket code, existing
  tooltip `Projected from cloud — no local file yet.`
- **Behavior:** non-draggable (already enforced in `Column` and
  `SwimlaneBoard`). Opens read-only in the ticket viewer.
- **Do not imply:** ownership, an active editor, "online now", or that the card
  is editable. No presence dot, no activity feed.

### 2. Stale projection

- **Trigger:** `stale === true` for the project stream (disconnected, gap
  recovery in progress, or apply/persist failed).
- **Render:** keep the last projection **visible** (`BR-1.5`, SC-5). Add a
  subdued visual cue: lower opacity (existing `opacity-85` baseline pushed to
  `~0.6`), and a small "stale" affordance on the card (muted icon or caption,
  e.g. a faded `CloudOff`-style glyph). The card remains non-draggable and
  read-only.
- **Board-level cue:** a single project sync-status chip (see §3) shows the
  project is stale; per-card text stays minimal to avoid noise across many
  cards.
- **Do not:** remove the card, block local ticket use, or auto-refresh on a
  timer. Local Markdown tickets remain fully usable and editable. Do not show a
  countdown or precise revision gap — the browser does not own that.

### 3. Project sync-status chip (connecting / live / stale / authentication_required)

- **Location:** one compact chip in the board header, mirroring the existing
  `AuthStatusAction.tsx` bordered-chip form (not a new modal or banner system).
- **States:**
  - `connecting` — backend stream is establishing/reconnecting/catching up.
    Neutral muted chip. No D1 traffic implication exposed.
  - `live` — stream is live and healthy. Optional/implicit; can be omitted or a
    quiet "synced" state to avoid bragging UI. No live indicator that pulses or
    implies presence.
  - `stale` — last projection visible but stream not live (SC-5). Warning-toned
    chip; local use unaffected.
  - `authentication_required` — the backend cannot obtain a valid credential
    (e.g. no valid `cloudflared` application token yet). Action chip prompting
    an owner action; does **not** expose the token, origin, or principal. Until
    resolved, the board shows last-known projections as stale.
- **Source:** an ordinary local SSE/local event carrying only the status word
  and, for `authentication_required`, a short human instruction. No cursor,
  revision, or endpoint.
- **Do not:** expose `projectRevision`, `afterRevision`, catch-up progress,
  reconnect backoff values, or the cloud WebSocket URL. The chip is a
  capability/status affordance, not a transport debug panel.

### 4. Canonical local ticket (unchanged baseline)

- **Trigger:** `kind === 'canonical'`.
- **Render:** exactly as today (`DraggableTicketCard`, editable, full board
  behavior). A same-number projection is suppressed in the unified read model
  (`BR-1.9`, SC-8) so the local ticket is the single source of truth.

## What not to build

- No presence indicators, active-editor avatars, or "who is editing" UI.
- No activity feed, change log, or revision timeline in the browser.
- No new modal/overlay system for these states — inline card + header chip.
- No auto-merge of projected fields into local tickets; local always wins.
- No browser-owned cursor, catch-up progress bar, reconnect button that drives
  cloud transport, or `/cloud-projections` request.
- No polling timer in the browser. Updates arrive as ordinary SSE ticket events.
- No exposure of Cloudflare Access tokens, origins, or principals to the UI.

## Verification mapping

| Requirement / scenario | UX evidence |
| --- | --- |
| `BR-1.5`, SC-5 (disconnected board stale) | Stale projection card stays visible + project chip shows `stale`; local use unblocked |
| `BR-1.6`, SC-3 (tabs share one stream) | Additional tabs show the same unified ticket view via SSE; no per-tab cloud indicator beyond the shared project chip |
| `BR-1.9`, SC-8 (local wins) | Same-number projection suppressed; canonical card rendered |
| `C-3` (no browser credentials) | Chip/card carry no token/origin/principal |
| `C-11` (browser read-model boundary) | Item metadata is `kind/readOnly/stale` + status word only |

## Reviewer verdict

**Verdict: APPROVED to proceed to Tests.**

Rationale: the four states are rendered from backend-owned capability metadata
and a single project sync-status event, never from projection protocol state.
The design reuses `CloudProjectionStub`, the `AuthStatusAction` chip idiom, and
ordinary SSE — no new transport or modal system. Stale keeps the last
projection visible and local use unblocked, matching SC-5. No presence, body,
credential, or revision detail leaks to the browser. The design does not weaken
any browser/no-polling requirement.

Open, non-blocking detail for implementation: the exact quiet-vs-explicit
treatment of the `live` chip state (omit vs. "synced") can be settled during
implementation UAT without changing the contract.
