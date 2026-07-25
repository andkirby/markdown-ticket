# UX Design: MDT-200 Cloud Sync Board States

**Scope**: only the durable UX for states cloud sync adds to the existing
board. This is a focused spec, not a redesign. Existing board patterns are
reused (`TicketCard`, `Board.tsx` Tailwind idioms, `opacity-50 cursor-not-allowed`
for disabled). See [`src/MODALS.md`](../../../src/MODALS.md) for overlay rules.

**Why a gate**: projection stubs, stale state, conflicts, and degraded behavior
change what the board shows. The board must never confuse projected state with
canonical local state (BR-3.4).

## States to render

### 1. Cloud-projected header stub (BR-3.4, board_distinguishes_projected_state)

A ticket header exists in the cloud projection but no canonical Markdown file
exists locally.

- Render in the board/list **only** the approved projected fields: code, title,
  status, type, priority, assignee, dates.
- **Never** render a body, description, comments, or any field not in the
  projection (BR-3.1).
- Visual distinction (reuse existing idioms, no new design system):
  - A small, muted label/badge: "cloud" (text + icon, e.g. `CloudIcon` from
    `lucide-react`).
  - Card uses reduced opacity / muted border to signal non-canonical.
  - **Not draggable** — reuse `opacity-50 cursor-not-allowed` from
    `Board.tsx:483`. No status change is possible on a stub.
- Copy/tooltip must **not** imply teammate ownership, presence, or that local
  content exists. Suggested: "Projected from cloud — no local file yet."
- Opening a stub shows a read-only summary with an explicit "canonical file not
  present" notice and the projected field values; no edit controls.

### 2. Stale projection (BR-3.2, stale_projection_rejected)

The client's view is older than the server's current projection version.

- Do not block the board. Mark affected stubs with a muted "stale" indicator
  (clock icon) distinct from "cloud".
- The next successful poll within `pollIntervalSeconds` resolves it
  (BR-3.3). No automatic retry storm.
- A divergent conflict (content hash mismatch on publish) is **not** auto-resolved.
  Show "conflict — reconcile via Git" and stop projection retries for that ticket
  (operations.md § Projection Conflict Storm).

### 3. Degraded / coordination unavailable (BR-1.5, BR-1.6)

- Existing projected stubs remain visible but gain a "stale" indicator on the
  first failed poll after the outage; they do not disappear.
- New cloud-bound creation is blocked. The create UI surfaces a clear,
  non-blocking error: "Cloud coordination unavailable — existing tickets remain
  editable." Never a silent fallback to a local number.
- Existing Markdown tickets remain fully editable; no visual change to them.

### 4. Cloud-binding disabled (BR-4.2)

- Once detached, projected stubs disappear from the board (they were derived).
- Canonical local tickets are unchanged. No "ghost" of the cloud state remains.

## What not to build

- No presence/online indicators (C8).
- No activity feed, no "who is editing", no live cursors.
- No new modal system; cloud states use existing card/overlay patterns.
- No automatic merge of cloud values into local files (C2).

## Verification mapping

- BR-3.4 → board_distinguishes_projected_state (BDD): stub renders labeled,
  read-only, non-draggable, no ownership implication.
- BR-3.1 → projection_excludes_body (BDD): no body field rendered for a stub.
- BR-3.2 → stale_projection_rejected (BDD): stale indicator, no auto-merge.
- BR-1.5/1.6 → coordination_unavailable_no_fallback / offline_existing_tickets_editable
  (BDD): degraded UI blocks create but keeps existing tickets editable.

## Open question for User Review

If a richer interaction model is later wanted (e.g. one-click "create local
file from projection"), that is a product decision beyond the first slice and
requires a separate ticket. The first slice only **displays** projected stubs.
