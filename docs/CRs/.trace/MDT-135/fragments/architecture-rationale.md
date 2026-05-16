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

```text
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

```text
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
