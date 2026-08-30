# Tech Debt: MDT-237

## Blocking debt
None — all review issues resolved (PV-1 C4 implemented+tested; PV-2 TTL refresh; PV-3 guard).

## Follow-ups (non-blocking)
| ID | Item | Why deferred |
|----|------|--------------|
| TD-1 | Existence cache invalidation is TTL-based (60s), not SSE-event-driven | Wiring SSE document-change events into the cache crosses view/module boundaries; TTL bounds staleness adequately for BR-2.1's "visibly flagged" purpose |
| TD-4 | Ticket-relative existence is unverifiable (docs tree excludes the tickets area by design), so BR-2.4 uses "project-root provably exists wins" rather than true relative-first verification | A ticket/subdoc index would need board-state plumbing; current rule handles the observed failure mode (MDT-236 frontend/src/THEME.md) |
| TD-2 | Bare multi-word filenames with spaces (`my file.md`, no slash) stay verbatim by design (command false-positive guard) | Documented behavior; plain-text refs share the same limitation |
| TD-3 | Ticket-subdoc URLs carry unencoded spaces for space-containing subdoc paths | Pre-existing MDT-150 URL scheme behavior, out of scope |
