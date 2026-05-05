# Requirements: MDT-152

**Source**: [MDT-152](../MDT-152-cross-project-search.md)
**Generated**: 2026-04-29

## Overview

Cross-project search enables users to discover tickets and projects from a single entry point. Users benefit from reduced context switching and faster ticket location. Key constraint: cross-project searches require backend fetch with debounced loading states.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Runtime Prereqs), tasks.md (Implement backend endpoint) |
| C2 | architecture.md (Runtime Prereqs), tests.md (debounce verification) |
| C3 | architecture.md (API Design), tasks.md (Implement result limits) |
| C4 | tests.md (skeleton render timing) |
| C5 | tests.md (layout stability) |
| C6 | architecture.md (Module Boundaries), tasks.md (Integration work) |
| C7 | architecture.md (Module Boundaries), tasks.md (Integration work) |
| C8 | architecture.md (Pattern Reference) |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Current project exclusion | Exclude from ProjectBrowserPanel results when query matches code/name; do NOT exclude from QuickSearch ticket key results | Exclude from all search modes | Design Spec clarifies: specific ticket match (MDT-136) should show in Current Project section |
| @syntax trigger | Requires space after project code to trigger project-scoped search | Trigger immediately on @CODE match | Space disambiguates "@ABC" (project search) from "@ABC login" (search in ABC) |
| Debounce timing | 300ms after last keystroke | 500ms, 150ms | Matches common patterns (GitHub, Linear, Slack) per DD-2 |
| Result limits | 5 per project, 15 max total for cross-project; no limit for current project | Uniform limit across modes | Cross-project can hit many projects; current project is preloaded |

## Open Questions Resolved

| Question | Resolution | Source |
|----------|------------|--------|
| Backend endpoint design | Single endpoint with mode parameter | Deferred to `/mdt:architecture` |
| Project ticket caching | Yes, 5 min TTL | Design Spec DD-1 |

## Verification Notes

**Scope coverage verified**:
- [x] ProjectBrowserPanel search: BR-1.1 through BR-1.6
- [x] Cross-project ticket key: BR-2.1 through BR-2.7
- [x] Project-scoped search: BR-3.1 through BR-3.5
- [x] Default current project: BR-4.1, BR-4.2
- [x] Mode indicators: BR-5.1, BR-5.2
- [x] Keyboard navigation: BR-6.1 through BR-6.3
- [x] Edge cases: Edge-1 through Edge-6

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
