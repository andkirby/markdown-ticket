# Requirements: MDT-237 — Inline-code .md references as clickable links

Canonical requirement records live in spec-trace (see `requirements.trace.md`).
This file records workflow narrative only.

## Scope Decision

CR declares **Requirements Scope: full**. Delivery timing for all requirements: **Now**.

## Approach Semantics (Non-Ambiguity Table)

| Concept | Locked definition |
|---------|-------------------|
| Qualifying span | An inline-code span whose **entire** content (minus optional `#anchor`) matches the `.md` document-reference shape already accepted for plain-text references (C1) |
| Genuine code | Any inline-code span that is not a qualifying span — preserved verbatim (BR-3.2) |
| Detection side | Render-side only; no authoring convention is required, none is enforced |
| Anchor fragments | **Supported** via the existing MDT-150 URL scheme (C2) — `resolveDocumentRef` already carries anchors |
| Same-name disambiguation | Inherits MDT-150 ticket-context vs documents-view semantics unchanged (C3) |
| Spaces/encoding | Inherits the query-parameter document URL scheme with `encodeURIComponent` (C4) |
| Broken reference | A converted link whose target document does not exist; visibly flagged (BR-2.1) |
| Performance | No per-span network requests at render time (C5) |
| Project-root fallback | A ref naming an existing project-root file (e.g. 'frontend/src/THEME.md') resolves to that document; explicit '..' refs are never re-anchored (BR-2.4, UAT 2026-08-24) |
| Link config precedence | localStorage override > CONFIG_DIR/config.toml [links] > defaults (C6, UAT 2026-08-24) |

## Behavioral Coverage Summary

- BR-1.1/BR-1.2 — conversion + client-side navigation (the core feature)
- BR-2.1/BR-2.2 — broken and out-of-scope/traversal flagging
- BR-3.1/BR-3.2 — preservation of fenced-code and genuine-code rendering
- BR-4.1 — no regression to existing links and ticket-key linkification
- C1–C5, Edge-1 — constraints and the command-example edge case

## Traceability

All records: `spec-trace requirement` store for MDT-237, source-ref
`docs/CRs/MDT-237-inline-code-doc-links.md` (sections 2, 4, 5). Projection:
`docs/CRs/MDT-237/requirements.trace.md`.

**Next**: `mdt:bdd MDT-237`
