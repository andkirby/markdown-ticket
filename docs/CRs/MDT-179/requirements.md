# Requirements: MDT-179

**Source**: [MDT-179](../MDT-179-scoped-global-search.md)
**Generated**: 2026-06-05

## Overview

MDT-179 introduces scoped global search to the QuickSearch command palette (Cmd+K). Users will be able to search across three entity types — projects, tickets, and documents — from a single entry point, with visible scope controls and grouped results. The feature extends the current ticket-only search pipeline into a multi-entity scoped search model.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Layout Stability), tasks.md (Verify) |
| C2 | architecture.md (Responsive Layout), tests.md (visual regression) |
| C3 | architecture.md (Keyboard Focus), tasks.md (Verify) |
| C4 | architecture.md (Access Control), tests.md (negative access tests) |
| C5 | architecture.md (Backward Compatibility), tests.md (preservation tests) |
| C6 | architecture.md (Extensibility), tests.md (structure assertion) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Search scope | A user-selected filter that determines which entity types are searched. Default is Global (all types). | Auto-detected mode based on query syntax only | Ticket requires visible user controls, not hidden detection |
| Partial project name match | Each whitespace-delimited query term must match a word prefix in the project name (case-insensitive). "task ma" matches "Task Manager" because "task" matches "Task" prefix and "ma" matches "Manager" prefix. | Substring match across the full project name | Prevents false matches like "catalog" matching "Decalog" |
| Scope indicator | A persistent UI element showing the active search scope label (Global / Tickets / Projects / Documents). | Transient tooltip or status bar text | Must be visible at all times while the modal is open (AC #1) |
| Query preservation on scope switch | When switching scope, the query text is preserved and results are re-fetched for the new scope. | Clearing the query on scope switch | Preserving query is more predictable; clearing is the exception not the default |
| Grouped results | Results displayed in labeled sections with section headers, where each section contains one entity type. | Interleaved results with type badges only | Ticket explicitly requires "separate labeled groups" (AC #5) |
| Keyboard scope switch | A dedicated key combination (e.g., Ctrl+Arrow or numbered shortcuts 1-4) that changes the active scope. | Repeated Cmd+K presses to cycle modes | Ticket says repeated shortcut "may cycle" but must not be the only way (AC #3, #4) |

## Open Questions for Architecture

1. **Semantic prefixes**: Which prefix syntax should power users use? (e.g., `p:task ma` for projects, `t:179` for tickets). Must not conflict with `@CODE` syntax.
2. **Document search scope**: Should document search query title/path only initially, or also content? Assess artifact defers this decision.
3. **Project result ranking**: When should project results appear above ticket results in global mode? Related to BR-3.3 (ticket key priority).

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
