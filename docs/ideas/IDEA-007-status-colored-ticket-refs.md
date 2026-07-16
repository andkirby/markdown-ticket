---
id: IDEA-007
status: triage
date: 2026-07-16
resolution-date:
promoted-to:
---

# Status-Colored Ticket Reference Badges

## Idea
Color-code each ticket reference inside relationship badges (Related / Depends On / Blocks) according to the *referenced* ticket's status, so you can see at a glance whether `MDT-045` is in progress, done, blocked, or rejected — without clicking through. The relationship type still drives the badge outline (🔗/⬅️/➡️); the status would show on each individual ref inside it.

Visual treatment is undecided — candidates: a small colored triangle in the corner, a colored underline, or colored text. (See Open UX Question below.)

## Investigation
The data and styling needed already exist; only the wiring is missing.

**What's already there:**
- `useProjectManager` holds `tickets: Ticket[]` (every ticket for the current project, each with a `status`) — so the referenced ticket's status is available client-side for same-project refs. (`src/hooks/useProjectManager.ts:75,316`)
- Status colors are centralized in `src/components/Badge/badge.css:26-79`, keyed by `data-status`. No JS color logic — pure CSS attribute selectors. Reusable as-is.
- `RelationshipBadge` (`src/components/Badge/RelationshipBadge.tsx:32-46`) renders each ref as a `<SmartLink>` but currently receives only `links: string[]` (bare codes) — it has no status and does no lookup today.

**What's missing:**
- A `Map<code, status>` lookup (today lookups are ad-hoc `tickets.find(...)` at `App.tsx:297`, `Column/index.tsx:179,197,203`, `Board.tsx:80`).
- Threading that lookup (or a `tickets` prop) into `RelationshipBadge`.
- The same idea applies to **inline markdown refs** (`convertTicketReferences` in `src/utils/markdownPreprocessor.ts:125-130` → `SmartLink` `LinkType.TICKET` in `src/components/SmartLink/index.tsx:115-125`), which are plain links today.

**Edge case:** `useProjectManager` only loads tickets for the *currently selected* project. Cross-project refs (e.g. `OTHER-045`) have no client-side status — needs a neutral/unknown fallback. Same-project refs cover the common case.

**Effort:** S. The lookup map is the only non-trivial bit, and it's a `useMemo` over `tickets`. Everything else is a CSS attribute on an existing element.

## Decision
Recommendation: **promote as a small Frontend / UX CR.** Low effort, high legibility payoff, no backend or data-model change. Decide the visual treatment in the CR's design step (corner triangle vs. underline vs. colored text) with a quick mock — this is the only real open question.

## Open UX Question — visual treatment
Status color could be applied per-ref in several ways. Trade-offs:

| Treatment | Pros | Cons |
|-----------|------|------|
| **Colored underline** on the ref text | Subtle, doesn't crowd the compact badge; reads like a link affordance | Thin underline may be hard to see on dense cards |
| **Small colored dot/triangle** (corner of the ref) | Color-pop without recoloring text; works in compact mode | Adds visual elements in an already busy `+N` badge |
| **Colored text** (the ref code itself) | Strongest signal, immediate | Competes with the relationship-type color of the badge; may clash |
| **Left border / chip** around the ref | Clear, badge-like | Heavier; may not fit the compact `+N` layout |

Recommended starting point: **colored left-border or underline**, leaving the relationship-type color intact — keeps the two dimensions (relationship vs. status) visually separate. Settle with a mock in the CR.

## References
- `src/components/Badge/RelationshipBadge.tsx:32-46` — component to extend (currently `links: string[]`, no status)
- `src/components/Badge/badge.css:26-79` — existing `data-status` color system (reusable)
- `src/config/statusConfig.ts:6-63` — status → color token map
- `src/hooks/useProjectManager.ts:75,316` — `tickets: Ticket[]` source for the lookup
- `src/utils/markdownPreprocessor.ts:125-130` — inline `MDT-123` refs in body text (second surface)
- `src/components/SmartLink/index.tsx:115-125` — `LinkType.TICKET` rendering (no status styling today)
- `src/components/TicketAttributeTags.tsx:68-94` — where RelationshipBadge is used on cards
