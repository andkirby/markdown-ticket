# Requirements: MDT-244

**Source**: [MDT-244](../MDT-244-type-icon-ticket-key-options.md)
**Generated**: 2026-09-02

## Overview

Optional ticket-type glyph display: a glyph slot in the ticket-key line (between key and epic marker) and an optional leading glyph inside the type badge, each driven by its own app-configuration option, with a suppression rule that hides the badge where the key row already shows the glyph. Benefits: type becomes a positionally-stable, everywhere-scannable marker like priority; density improves on cards.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (config selector registration + delivery seam), tasks.md (scope/verify) |
| C2 | architecture.md (defaults/absent-key handling), tasks.md (verify) |
| C3 | architecture.md (rendering spec), tests.md (glyph assertions), ux-design.md |
| C4 | ux-design.md (accessibility), tests.md (aria assertions) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| "key-icon option enabled" | selector `ui.ticketKey.typeIconNearKey` === `true`; absent or false = disabled | key presence implies enabled | explicit value beats inference; absent-key default is off |
| "same header row" (suppression scope) | ticket key and type badge rendered within one visual header line of a surface (today: ticket viewer header only) | anywhere on the same surface | suppression prevents duplicate encoding in one glance line, not across a whole view |
| "type badge" | the labeled badge whose text is the ticket type | status/priority badges | the feature only manages type encoding |
| "epic marker" | the existing gold lightning glyph after epic keys (`level: epic`) | any new epic indicator | epic marker already exists; this ticket only formalizes its slot |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `ui.ticketKey.typeIconNearKey` | show/hide the type glyph in the ticket-key line | `false` | no glyph in key line; rendering identical to pre-feature |
| `ui.ticketKey.typeIconInBadge` | show/hide the leading glyph inside the type badge | `false` | text-only badge |

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
