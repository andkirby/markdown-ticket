# Architecture

## Rationale

## Pattern

**Badge Module with Variant-based Styling**

Create a dedicated `Badge/` module that owns ALL ticket attribute badge rendering:
- Uses `cva` (class-variance-authority) for type-safe variants
- Centralizes ALL color mappings in `badgeVariants.ts`
- Provides specialized components for each attribute type

## Rationale

1. **Single Owner**: The `Badge/` module owns ALL badge styling. No other component defines badge colors.
2. **Variant Pattern**: Using `cva` variants provides type safety, IDE autocomplete, and consistent API.
3. **Unified Styling**: Resolve gradient vs solid inconsistency by standardizing on gradient styling for priority/type badges.
4. **Dark Mode Consistency**: All variants use the same shade convention (`950` for backgrounds).
5. **Extensibility**: New attribute types only require adding a variant mapping.

## Structure

```
src/components/
└── Badge/
    ├── index.ts              # Export all badge components
    ├── StatusBadge.tsx       # Status badge (Proposed, Approved, In Progress, etc.)
    ├── PriorityBadge.tsx     # Priority badge (Critical, High, Medium, Low)
    ├── TypeBadge.tsx         # Type badge (Feature, Bug, Architecture, etc.)
    ├── ContextBadge.tsx      # Context badges (Phase/Epic, Assignee, Worktree)
    ├── RelationshipBadge.tsx # Relationship badges (Related, Depends, Blocks)
    ├── badgeVariants.ts      # cva variants for ALL attribute colors
    └── types.ts              # Shared types
```

## Component API

```typescript
// StatusBadge
<StatusBadge status="In Progress" />

// PriorityBadge
<PriorityBadge priority="High" />

// TypeBadge
<TypeBadge type="Feature Enhancement" />

// ContextBadge
<ContextBadge variant="phase" value="Phase 1" />
<ContextBadge variant="assignee" value="john" />
<ContextBadge variant="worktree" />

// RelationshipBadge
<RelationshipBadge variant="related" links={["MDT-100", "MDT-101"]} />
<RelationshipBadge variant="depends" links={["MDT-050"]} />
<RelationshipBadge variant="blocks" links={["MDT-200"]} />
```

## Runtime Flow

```
Ticket data → Specialized Badge Component → badgeVariants(attribute, value) → Badge(base classes) → Rendered output
```

**Owner**: `Badge/` module owns the attribute-to-color mapping flow for ALL badge types.

## Color Palettes

### Status Colors (Solid)
| Status | Light | Dark |
|--------|-------|------|
| Proposed | gray-100 / gray-800 | gray-950 / gray-200 |
| Approved | blue-100 / blue-800 | blue-950 / blue-200 |
| In Progress | yellow-100 / yellow-800 | yellow-950 / yellow-200 |
| Implemented | green-100 / green-800 | green-950 / green-200 |
| Rejected | red-100 / red-800 | red-950 / red-200 |
| On Hold | orange-100 / orange-800 | orange-950 / orange-200 |
| Partially Implemented | purple-100 / purple-800 | purple-950 / purple-200 |

**Decision**: Use gray for Proposed (neutral/pending state) and green for Implemented (completed state).

### Priority Colors (Gradient)
| Priority | Gradient |
|----------|----------|
| Critical | rose-100 → rose-200 |
| High | rose-50 → rose-100 |
| Medium | amber-50 → amber-100 |
| Low | emerald-50 → emerald-100 |

### Type Colors (Gradient)
| Type | Gradient |
|------|----------|
| Feature Enhancement | blue-50 → indigo-100 |
| Bug Fix | orange-50 → amber-100 |
| Architecture | purple-50 → violet-100 |
| Technical Debt | slate-50 → gray-100 |
| Documentation | cyan-50 → teal-100 |
| Research | pink-50 → rose-100 |

### Relationship Colors (Solid)
| Relationship | Color |
|--------------|-------|
| Related | cyan-100 / cyan-800 |
| Depends On | amber-100 / amber-800 |
| Blocks | rose-100 / rose-800 |

### Context Colors (Solid)
| Context | Color |
|---------|-------|
| Phase/Epic | gray-100 / gray-800 |
| Assignee | purple-100 / purple-800 |
| Worktree | emerald-50 / emerald-700 |

**Decision**: Use gradient styling for priority and type badges (more visual distinction), solid colors for status and relationships.

## Extension Rule

To add a new badge type:
1. Add variant mapping in `badgeVariants.ts`
2. Create specialized component (e.g., `NewBadge.tsx`)
3. Export from `index.ts`
4. No changes needed in consumer components

## Module Boundaries

- **Badge module**: `src/components/Badge/` - owns ALL badge styling
- **Consumers**: Import specialized badge components, pass attribute value only
- **No direct color access**: Consumers never access `badgeVariants` directly

## Consumer Migration

| Consumer | Current | After |
|----------|---------|-------|
| `ProjectView.tsx` | `getStatusBadgeClass()` | `<StatusBadge status={...} />` |
| `TicketAttributeTags.tsx` | `getStatusColor()`, `getPriorityColor()`, `getTypeColor()` | `<StatusBadge />`, `<PriorityBadge />`, `<TypeBadge />` |
| `TicketAttributes.tsx` | `getStatusColor()`, `getPriorityColor()`, `getTypeColor()` | `<StatusBadge />`, `<PriorityBadge />`, `<TypeBadge />` |

## Invariants

1. `badgeVariants.ts` is the ONLY file that defines badge colors
2. All badges must render via Badge module components
3. Dark mode uses `950` shade for all solid backgrounds
4. Priority/Type badges use gradient styling
5. Status/Relationship badges use solid styling

## Obligations

- badgeVariants.ts defines ALL attribute color mappings using cva (`OBL-color-source`)
  Derived From: `BR-2`, `BR-6`, `BR-7`, `C3`, `C5`
  Artifacts: `ART-badge-variants`, `ART-badge-types`
- All views (ProjectView, TicketAttributeTags, TicketAttributes) import StatusBadge (`OBL-consumer-migration`)
  Derived From: `BR-1`, `C4`
  Artifacts: `ART-project-view`, `ART-ticket-attribute-tags`, `ART-ticket-attributes`
- ContextBadge component for phase/epic, assignee, worktree (`OBL-context-badges`)
  Derived From: `BR-8`
  Artifacts: `ART-context-badge`, `ART-status-variants`
- All status variants use consistent dark mode shades (950) (`OBL-dark-mode`)
  Derived From: `BR-3`
  Artifacts: `ART-status-variants`
- PriorityBadge component with unified gradient styling (`OBL-priority-badge`)
  Derived From: `BR-4`, `BR-6`
  Artifacts: `ART-priority-badge`, `ART-status-variants`
- RelationshipBadge component for related, depends, blocks (`OBL-relationship-badges`)
  Derived From: `BR-8`
  Artifacts: `ART-relationship-badge`, `ART-status-variants`
- Remove inline getStatusColor/getStatusBadgeClass functions from consumers (`OBL-remove-dupes`)
  Derived From: `C4`
  Artifacts: `ART-project-view`, `ART-ticket-attribute-tags`, `ART-ticket-attributes`
- Badge module owns ALL ticket attribute badge rendering (`OBL-single-owner`)
  Derived From: `BR-1`, `BR-4`, `BR-5`, `C3`, `C4`
  Artifacts: `ART-status-badge`, `ART-status-variants`, `ART-badge-index`
- E2E tests continue to pass without modification (`OBL-test-compat`)
  Derived From: `C1`
  Artifacts: `ART-e2e-list-view`
- TypeBadge component with unified gradient styling (`OBL-type-badge`)
  Derived From: `BR-5`, `BR-7`
  Artifacts: `ART-type-badge`, `ART-status-variants`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-badge-index` | `src/components/Badge/index.ts` | runtime | `OBL-single-owner` |
| `ART-badge-types` | `src/components/Badge/types.ts` | runtime | `OBL-color-source` |
| `ART-badge-variants` | `src/components/Badge/badgeVariants.ts` | runtime | `OBL-color-source` |
| `ART-context-badge` | `src/components/Badge/ContextBadge.tsx` | runtime | `OBL-context-badges` |
| `ART-e2e-list-view` | `tests/e2e/list/view.spec.ts` | test | `OBL-test-compat` |
| `ART-priority-badge` | `src/components/Badge/PriorityBadge.tsx` | runtime | `OBL-priority-badge` |
| `ART-project-view` | `src/components/ProjectView.tsx` | runtime | `OBL-consumer-migration`, `OBL-remove-dupes` |
| `ART-relationship-badge` | `src/components/Badge/RelationshipBadge.tsx` | runtime | `OBL-relationship-badges` |
| `ART-status-badge` | `src/components/Badge/StatusBadge.tsx` | runtime | `OBL-single-owner` |
| `ART-status-variants` | `src/components/Badge/statusVariants.ts` | runtime | `OBL-context-badges`, `OBL-dark-mode`, `OBL-priority-badge`, `OBL-relationship-badges`, `OBL-single-owner`, `OBL-type-badge` |
| `ART-ticket-attribute-tags` | `src/components/TicketAttributeTags.tsx` | runtime | `OBL-consumer-migration`, `OBL-remove-dupes` |
| `ART-ticket-attributes` | `src/components/TicketAttributes.tsx` | runtime | `OBL-consumer-migration`, `OBL-remove-dupes` |
| `ART-type-badge` | `src/components/Badge/TypeBadge.tsx` | runtime | `OBL-type-badge` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1` | 2 | `OBL-consumer-migration`, `OBL-single-owner` |
| `BR-2` | 1 | `OBL-color-source` |
| `BR-3` | 1 | `OBL-dark-mode` |
| `BR-4` | 2 | `OBL-priority-badge`, `OBL-single-owner` |
| `BR-5` | 2 | `OBL-single-owner`, `OBL-type-badge` |
| `BR-6` | 2 | `OBL-color-source`, `OBL-priority-badge` |
| `BR-7` | 2 | `OBL-color-source`, `OBL-type-badge` |
| `BR-8` | 2 | `OBL-context-badges`, `OBL-relationship-badges` |
| `C1` | 1 | `OBL-test-compat` |
| `C3` | 2 | `OBL-color-source`, `OBL-single-owner` |
| `C4` | 3 | `OBL-consumer-migration`, `OBL-remove-dupes`, `OBL-single-owner` |
| `C5` | 1 | `OBL-color-source` |
