# Requirements: MDT-138

**Source**: [MDT-138](../MDT-138-add-dot-notation-namespace-system-for-sub-document.md)
**Generated**: 2026-03-12
**Scope**: Full

## Overview

MDT-138 introduces a dot-notation namespace system for sub-document tabs. Users can organize related documents using filename patterns like `architecture.approve-it.md` which appear as nested tabs `[architecture >] [approve-it]` without creating directories. The system integrates with existing MDT-093 folder-based sub-document discovery.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C-1 | architecture.md (Performance), tests.md (performance tests) |
| C-2 | architecture.md (UI Components), tasks.md (implementation) |
| C-3 | architecture.md (UI Components), tests.md (visual regression) |
| C-4 | architecture.md (API Design), tests.md (backward compatibility tests) |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Namespace parsing | First dot segment = namespace, rest = sub-key | Each dot = new nesting level | Simpler UX, matches user mental model |
| `[main]` tab display | Show ONLY when root `{type}.md` exists | Always show for any namespace | Cleaner UI when no root exists |
| Sorting | Alphanumerical within each namespace | Global sorting across all tabs | Namespace isolation is clearer |
| API representation | Virtual folders in existing `subdocuments` array | New `namespace` and `subKey` fields | Backward compatibility |
| Folder + dot collision | Folder content shows `[/name]` (gray `/`) | Merge, error, or precedence | Visual distinction without hiding content |

## Affected Document Types

The namespace system applies to these document types:
- `requirements`
- `bdd`
- `architecture`
- `tests`
- `tasks`

## Edge Case Behavior

| Pattern | Namespace | Sub-key | Notes |
|---------|-----------|---------|-------|
| `a.b.c.md` | `a` | `b.c` | 3 segments - standard case |
| `a.b.c.d.md` | `a` | `b.c.d` | 4+ segments - preserve all after first |
| `tests.e2e-smoke.md` | `tests` | `e2e-smoke` | Hyphens preserved |
| `architecture/` + `architecture.x.md` | Both displayed | N/A | Folder and dot coexist |

## Folder + Dot Coexistence Rule

When `{type}.{semantic}.md` AND `{type}/{other}.md` coexist:

| File | Display | Style |
|------|---------|-------|
| `bdd.one.md` | `[one]` | Normal |
| `bdd/two.md` | `[/two]` | Gray `/` prefix |

The `/` prefix (gray) visually distinguishes folder content from dot-notation content within the same namespace.

## Delivery Timing

All requirements scheduled for **Now** - complete in this ticket.

---
*Trace projection: [requirements.trace.md](./requirements.trace.md)*
