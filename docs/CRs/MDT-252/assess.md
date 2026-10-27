# Assessment: MDT-252

## Verdict

**Recommendation**: Option 2 — Redesign Inline.

The existing ownership layers can absorb refs/config/resolution without a new service or package. Quick Search needs a bounded change because its key-shaped routing currently excludes external references.

## Feature Pressure

### Target Feature Needs

- Stored, instance-scoped external identifiers preserved through all ticket reads and unrelated writes.
- Per-project configured tracker destinations and truthful card/viewer links.
- Free-text discovery by external identifiers, including identifiers shaped like local keys.

### Current System Assumptions

- Domain ticket/frontmatter/update schemas enumerate supported fields; refs is absent.
- shared/models/Ticket.ts normalizes relationships explicitly; MarkdownService owns parsing/generation and metadata scans.
- LocalProjectConfigSchema is strict; the legacy ProjectConfigSchema permits extension fields. Tracker config needs explicit support through both canonical and runtime paths.
- server/services/TicketService.ts searchByTicketKey resolves one local project and normalizes its number; frontend/src/hooks/useQuickSearch.ts routes local-key-shaped text to that mode.
- Cards render shared TicketAttributeTags; relationship badges already isolate nested navigation and provide overflow. External identifiers cannot use their local-key shortening/routing.

## Fitness Summary

| Dimension | Verdict | Why |
| --- | --- | --- |
| Structural Fit | Healthy | Domain contracts, shared services, adapters and UI retain established ownership. |
| Extension Fit | Concerning | Key-search dispatch assumes local identity exclusively. |
| Dependency Fit | Healthy | Local parsing/resolution only; no tracker API, authentication, network request or package required. |
| Verification Fit | Concerning | Existing local-key tests must remain green while adding ref round-trip and ambiguous search cases. |
| Redesign Scope | Healthy | Search matching/result metadata and reference presentation can change within this ticket. |

## Mismatch Points

### Quick Search identity routing

- Current system assumes: a local-key-shaped query names one local ticket/project.
- Feature needs: local and exact external matches returned together with source labels, no external zero-padding, no fuzzy auto-open, deduplication by local identity.
- Mismatch: the current early return for nonexistent local projects hides valid external matches.
- Adjustment required: shared external identifier matching and additive search result provenance, integrated with all affected search modes and frontend selection rules.
- Scope: bounded; preserve local normalization solely for the local lookup.

### Explicit schema and serialization paths

- Current system assumes: only the enumerated ticket/config fields cross strict schemas, normalization, and serializers.
- Feature needs: refs survive metadata scans, detailed reads, creates, updates and unrelated edits; unresolved refs remain preserved.
- Mismatch: adding a UI field alone would silently drop stored data in other consumers.
- Adjustment required: extend canonical contracts and shared parser/mutation/config/resolver ownership before consumer presentation. CLI remains argv/rendering only.
- Scope: local extensions across existing boundaries; requires a complete path audit at Architecture.

## Dependency and Tooling Pressure

- New packages: none expected.
- Runtime/config impact: optional [trackers.<instance>] configuration and refs frontmatter, preserving no-config behavior. MDT-254 is implemented and supplies the canonical local-key patterns; do not duplicate or widen them here.
- Testing/E2E impact: add focused ref round-trip/config/URL-resolution/search tests plus isolated UI navigation, overflow and drag-isolation acceptance tests.
- Main risk introduced: silently losing refs or opening the wrong tracker instance through an inferred/incorrectly encoded URL.

## Verification Gaps

- Preservation tests needed: unknown refs through unrelated edits; unchanged local key search; key-shaped external match without a local project; duplicate matches and same-kind instances; base-URL context paths and GitLab subgroup encoding.
- E2E/contract drift risks: existing canonical card docs predate the current key/timestamp/title layout; update only after UI agreement.
- Safe-to-refactor now?: yes within these owners once the Tests milestone seals the required checks. No broad refactor is indicated.

## Recommendation

### Option 1: Integrate As-Is

Not selected: existing component/config extension seams fit, but the local-only search dispatch needs an explicit bounded redesign.

### Option 2: Redesign Inline

Selected: architecture must redesign key-shaped search matching and result provenance within MDT-252; this is already identified in the ticket's open questions and does not expand its scope. Keep refs and URL resolution in shared/domain owners; adapters pass typed requests/results.

### Option 3: Redesign First

Not indicated: no foundational ownership or runtime change is needed. No prerequisite ticket beyond the already implemented MDT-254 is identified.
