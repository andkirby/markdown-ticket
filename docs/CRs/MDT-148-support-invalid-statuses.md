---
code: MDT-148
status: Implemented
dateCreated: 2026-04-06T10:55:00Z
type: Feature Enhancement
priority: Medium
---

# Support invalid/unknown ticket statuses

As a user, I want tickets with invalid status values (e.g., "In Review", "Under Review", "Awaiting Approval") to be handled gracefully without blocking drag-drop operations.

## Background

Status validation in `TicketService.updateCRStatus()` was too strict. Any status not in the `CRStatus` enum would throw an error:

```
Invalid status transition from 'In Review' to 'Implemented'
Valid transitions from 'In Review': [none]
```

This prevented moving tickets between columns in the Kanban board, causing 400 Bad Request errors when trying to update ticket status.

## Implementation

### Backend Changes

**File: `shared/services/TicketService.ts`**

Removed status transition validation from `updateCRStatus()` method:

```typescript
async updateCRStatus(project: Project, key: string, status: CRStatus): Promise<boolean> {
  try {
    const cr = await this.getCR(project, key)
    if (!cr) {
      throw new Error(`CR '${key}' not found in project '${project.id}'`)
    }

    // Note: Status transition validation removed to allow free movement
    // This accommodates legacy/unknown status values in existing tickets

    // Read current file content
    const content = await readFile(cr.filePath, 'utf-8')
    // ...
```

Tickets can now be moved to ANY status freely without validation errors.

### Frontend Changes

#### 1. Ticket Card Visual Indicators

**File: `src/components/TicketCard.tsx`**

Added detection for invalid status and conditional red border:

```tsx
const TicketCard: React.FC<TicketCardProps> = ({ ticket, ... }) => {
  const hasInvalidStatus = !isValidStatus(ticket.status)

  return (
    <div className={`... ${hasInvalidStatus ? 'ticket-card--invalid' : ''}`}>
      {/* ... */}
    </div>
  )
}
```

#### 2. Status Badge Warning

**File: `src/components/TicketAttributeTags.tsx`**

Added `isInvalidStatus` prop to pass validation state:

```tsx
interface TicketAttributeTagsProps {
  ticket: Ticket
  className?: string
  isInvalidStatus?: boolean // Status is invalid - highlight badge
}
```

**File: `src/components/Badge/StatusBadge.tsx`**

Added `isInvalid` prop with solid variant for invalid statuses:

```tsx
export interface StatusBadgeProps extends StatusVariantProps {
  className?: string
  isInvalid?: boolean // Status is invalid - applies warning styling
}

export function StatusBadge({ status, className, isInvalid = false, ...props }) {
  return (
    <Badge
      variant={isInvalid ? 'solid' : 'outline'}
      className={cn('badge', isInvalid && 'badge--invalid', className)}
      data-status={isInvalid ? 'invalid' : formatDataAttr(status)}
      {...props}
    >
      {status}
    </Badge>
  )
}
```

#### 3. Badge CSS Styling

**File: `src/components/Badge/badge.css`**

Added red gradient styling for invalid status:

```css
/* Invalid status (red gradient) */
.badge[data-status="invalid"] {
  @apply bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200 dark:from-red-950 dark:to-red-800 dark:text-red-200 dark:border-red-700;
}
```

**File: `src/components/ui/badge.tsx`**

Added 'solid' variant to CVA:

```tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        solid: 'text-foreground', // NEW
      },
    },
  },
)
```

#### 4. Ticket Card CSS

**File: `src/components/TicketCard/ticket.css`**

Created new CSS file for ticket card styling:

```css
/* Base ticket card class - keeps inline layout and spacing in TSX */
.ticket-card {
  @apply border-gray-200/50 dark:border-slate-700/50;
}

/* Invalid status state - red border and ring */
.ticket-card--invalid {
  @apply border-red-500 dark:border-red-500 ring-2 ring-red-500/30;
}
```

## Testing

### E2E Test Coverage

**File: `tests/e2e/board/invalid-status.spec.ts`**

Created comprehensive E2E tests covering:

1. **Visual indicators** - Verifies red border on card + red badge for invalid status
2. **Free drag-drop** - Confirms tickets with invalid status can be moved between columns without backend validation errors
3. **Selective highlighting** - Ensures only tickets with invalid status are highlighted, not all tickets
4. **Page refresh persistence** - Validates that warnings persist after page refresh (status stored in file)
5. **Multiple invalid values** - Tests various invalid status values ("In Review", "Under Review", etc.)

### Test Type: E2E Tests

**Why E2E tests instead of unit tests?**

| Aspect | Unit Tests | E2E Tests | Decision |
|---------|-------------|-------------|----------|
| Visual validation (red border, red badge) | ❌ Cannot test DOM structure | ✅ Can verify visual rendering | **E2E** |
| Drag-drop behavior | ❌ Mock drag-drop | ✅ Tests actual drag-drop API + backend | **E2E** |
| File system integration | ❌ Mock fs operations | ✅ Tests real file modifications | **E2E** |
| Page refresh persistence | ❌ Cannot test navigation | ✅ Tests browser refresh | **E2E** |
| End-to-end user flow | ❌ Fragmented | ✅ Tests complete user journey | **E2E** |

## Benefits

### User Experience

- ✅ **No blocking errors**: Users can move tickets with any status between columns
- ✅ **Clear visual feedback**: Invalid statuses are highlighted with red border + red badge
- ✅ **Data integrity preserved**: Invalid status is NOT auto-corrected or sanitized
- ✅ **Backward compatible**: Existing tickets with invalid status values continue to work

### Developer Experience

- ✅ **Flexible**: No need to maintain status transition validation matrix
- ✅ **Maintainable**: Visual styling follows established patterns from STYLING.md and BADGE_ARCHITECTURE.md
- ✅ **Testable**: E2E tests cover real-world usage scenarios

### Technical Decisions

1. **Removed validation instead of expanding enum**: Easier to allow unknown statuses than to maintain an ever-growing list of possible status values
2. **Visual warning instead of data corruption**: Invalid statuses are valid data from the past, just not recognized by current system
3. **Followed styling architecture**: Used data attributes and state modifiers per STYLING.md guidelines

## Related Files Changed

- `shared/services/TicketService.ts`
- `src/components/TicketCard.tsx`
- `src/components/TicketAttributeTags.tsx`
- `src/components/Badge/StatusBadge.tsx`
- `src/components/Badge/badge.css`
- `src/components/ui/badge.tsx`
- `src/components/TicketCard/ticket.css` (new file)
- `tests/e2e/board/invalid-status.spec.ts` (new file)

## Verification

All changes have been built and verified:
- ✅ TypeScript compilation successful
- ✅ Vite build successful
- ✅ Visual indicators confirmed via Playwright
- ✅ Drag-drop operation verified without validation errors
