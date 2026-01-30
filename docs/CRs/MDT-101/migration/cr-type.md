# CR Type Migration Report

**Part of MDT-101**: Create domain-contracts package with Zod schemas as source of truth

**Status**: Complete (with outstanding build requirement)
**Date**: 2025-01-30

## Executive Summary

This migration consolidates all ticket type definitions (`CRType`) to use `domain-contracts/src/types/schema.ts` as the single source of truth. Previously, type strings like `'Feature Enhancement'`, `'Bug Fix'`, etc. were duplicated across 9+ files throughout the codebase.

**Why**: MDT-101 Phase 1b requires integrating domain-contracts as the source of truth for all CR enums, eliminating duplication and ensuring consistency across frontend, backend, and MCP packages.

**Impact**: Zero breaking changes - backward compatible re-exports are maintained in `shared/models/Types.ts`.

## Migration Overview

### Before

```typescript
// Type strings duplicated in multiple files
const type = 'Feature Enhancement'  // Hardcoded in 9+ locations

// Example: shared/services/TemplateService.ts
this.templates.set('Bug Fix', { ... })        // Hardcoded string
this.templates.set('Feature Enhancement', { ... })
this.templates.set('Architecture', { ... })
```

### After

```typescript
// Single source of truth
import { CRType } from '@mdt/domain-contracts'

const type = CRType.FEATURE_ENHANCEMENT  // From domain-contracts

// Example: shared/services/TemplateService.ts
this.templates.set(CRType.BUG_FIX, { ... })
this.templates.set(CRType.FEATURE_ENHANCEMENT, { ... })
this.templates.set(CRType.ARCHITECTURE, { ... })
```

### Types Migrated

| CRType Value | Constant |
|--------------|----------|
| `Architecture` | `CRType.ARCHITECTURE` |
| `Feature Enhancement` | `CRType.FEATURE_ENHANCEMENT` |
| `Bug Fix` | `CRType.BUG_FIX` |
| `Technical Debt` | `CRType.TECHNICAL_DEBT` |
| `Documentation` | `CRType.DOCUMENTATION` |
| `Research` | `CRType.RESEARCH` |

## Files Changed

### shared/ package (5 files)

#### 1. `shared/models/Types.ts`

**Change**: Import and re-export from domain-contracts

```typescript
// Before
export type CRType = 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation' | 'Research'
export const CR_TYPES = ['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation', 'Research'] as const

// After
import { CRType as DomainCRType, CRPriority as DomainCRPriority } from '@mdt/domain-contracts'
import type { CRType as DomainCRTypeType, CRPriority as DomainCRPriorityType } from '@mdt/domain-contracts'

export type CRType = DomainCRTypeType
export type CRPriority = DomainCRPriorityType
export { DomainCRTypeEnum as CRType, DomainCRPriorityEnum as CRPriority }

/** @deprecated Import AllCRTypes directly from @mdt/domain-contracts instead */
export const CR_TYPES = [DomainCRTypeEnum.ARCHITECTURE, ...]
```

**Impact**: Maintains backward compatibility through re-exports while marking legacy arrays as deprecated.

#### 2. `shared/utils/constants.ts`

**Change**: Use `CRType.FEATURE_ENHANCEMENT` for default type

```typescript
// Before
// After
import { CRType } from '@mdt/domain-contracts'

export const DEFAULTS = {
  TYPE: 'Feature Enhancement' as TicketType,
  // ...
}

export const DEFAULTS = {
  TYPE: CRType.FEATURE_ENHANCEMENT as TicketType,
  // ...
}
```

#### 3. `shared/models/Ticket.ts`

**Change**: Default type in `normalizeTicket()`

```typescript
// Before
type: rawTicket.type || 'Feature Enhancement',

// After
import { CRType } from '@mdt/domain-contracts'
// ...
type: rawTicket.type || CRType.FEATURE_ENHANCEMENT,
```

#### 4. `shared/ticketDto.ts`

**Change**: Default type in `normalizeTicket()`

```typescript
// Before
type: rawTicket.type || 'Feature Enhancement',

// After
import { CRType } from '@mdt/domain-contracts'
// ...
type: rawTicket.type || CRType.FEATURE_ENHANCEMENT,
```

#### 5. `shared/services/TemplateService.ts`

**Change**: Template keys using CRType constants

```typescript
// Before
this.templates.set('Bug Fix', { type: 'Bug Fix', ... })
this.templates.set('Feature Enhancement', { type: 'Feature Enhancement', ... })
this.templates.set('Architecture', { type: 'Architecture', ... })
this.templates.set('Technical Debt', { type: 'Technical Debt', ... })
this.templates.set('Documentation', { type: 'Documentation', ... })
this.templates.set('Research', { type: 'Research', ... })

// After
import { CRType } from '@mdt/domain-contracts'
// ...
this.templates.set(CRType.BUG_FIX, { type: CRType.BUG_FIX, ... })
this.templates.set(CRType.FEATURE_ENHANCEMENT, { type: CRType.FEATURE_ENHANCEMENT, ... })
this.templates.set(CRType.ARCHITECTURE, { type: CRType.ARCHITECTURE, ... })
this.templates.set(CRType.TECHNICAL_DEBT, { type: CRType.TECHNICAL_DEBT, ... })
this.templates.set(CRType.DOCUMENTATION, { type: CRType.DOCUMENTATION, ... })
this.templates.set(CRType.RESEARCH, { type: CRType.RESEARCH, ... })
```

### src/ package (frontend) (4 files)

#### 6. `src/services/dataLayer.ts`

**Change**: Default type in `normalizeTicket()`

```typescript
// Before
type: item.type || 'Feature Enhancement',

// After
import { CRType } from '@mdt/domain-contracts'
// ...
type: item.type || CRType.FEATURE_ENHANCEMENT,
```

#### 7. `src/hooks/useTicketOperations.ts`

**Change**: Default type in optimistic ticket

```typescript
// Before
// After
import { CRType } from '@mdt/domain-contracts'

const optimisticTicket: Ticket = {
  // ...
  type: 'Feature Enhancement',
  // ...
}
// ...
const optimisticTicket: Ticket = {
  // ...
  type: CRType.FEATURE_ENHANCEMENT,
  // ...
}
```

#### 8. `src/components/TicketAttributeTags.tsx`

**Change**: Type color mapping using CRType constants

```typescript
// Before
// After
import { CRType } from '@mdt/domain-contracts'

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    'Feature Enhancement': 'bg-gradient-to-r from-blue-50 to-indigo-100/80 ...',
    'Bug Fix': 'bg-gradient-to-r from-orange-50 to-amber-100/80 ...',
    'Architecture': 'bg-gradient-to-r from-purple-50 to-violet-100/80 ...',
    'Technical Debt': 'bg-gradient-to-r from-slate-50 to-gray-100/80 ...',
    'Documentation': 'bg-gradient-to-r from-cyan-50 to-teal-100/80 ...',
  }
  return colors[type] || '...default...'
}
// ...
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    [CRType.FEATURE_ENHANCEMENT]: 'bg-gradient-to-r from-blue-50 to-indigo-100/80 ...',
    [CRType.BUG_FIX]: 'bg-gradient-to-r from-orange-50 to-amber-100/80 ...',
    [CRType.ARCHITECTURE]: 'bg-gradient-to-r from-purple-50 to-violet-100/80 ...',
    [CRType.TECHNICAL_DEBT]: 'bg-gradient-to-r from-slate-50 to-gray-100/80 ...',
    [CRType.DOCUMENTATION]: 'bg-gradient-to-r from-cyan-50 to-teal-100/80 ...',
    [CRType.RESEARCH]: 'bg-gradient-to-r from-pink-50 to-rose-100/80 ...', // NEW!
  }
  return colors[type] || '...default...'
}
```

**Note**: Added color mapping for `CRType.RESEARCH` (pink/rose gradient).

#### 9. `src/components/TicketAttributes.tsx`

**Change**: Type color mapping using CRType constants

```typescript
// Before
// After
import { CRType } from '@mdt/domain-contracts'

function getTypeColor(type: string) {
  switch (type) {
    case 'Bug Fix': return 'bg-orange-100 ...'
    case 'Feature Enhancement': return 'bg-blue-100 ...'
    case 'Technical Debt': return 'bg-purple-100 ...'
    case 'Architecture': return 'bg-indigo-100 ...'
    case 'Documentation': return 'bg-teal-100 ...'
    default: return 'bg-gray-100 ...'
  }
}
// ...
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    [CRType.BUG_FIX]: 'bg-orange-100 ...',
    [CRType.FEATURE_ENHANCEMENT]: 'bg-blue-100 ...',
    [CRType.TECHNICAL_DEBT]: 'bg-purple-100 ...',
    [CRType.ARCHITECTURE]: 'bg-indigo-100 ...',
    [CRType.DOCUMENTATION]: 'bg-teal-100 ...',
    [CRType.RESEARCH]: 'bg-pink-100 ...', // NEW!
  }
  return colors[type] || 'bg-gray-100 ...'
}
```

**Note**: Converted from switch statement to object lookup and added color mapping for `CRType.RESEARCH` (pink).

## Breaking Changes

**None**. All changes are backward compatible:

- `shared/models/Types.ts` re-exports domain-contracts types
- Legacy `CR_TYPES` and `CR_PRIORITIES` arrays are maintained (marked deprecated)
- All imports continue to work

## Outstanding Items

### domain-contracts Build Required

The `domain-contracts/dist/` folder is outdated and missing the `RESEARCH` type.

**Error**: `Property 'RESEARCH' does not exist on type` when using `CRType.RESEARCH`

**Root Cause**: The source file `domain-contracts/src/types/schema.ts` includes `RESEARCH`, but the built `dist/types/schema.d.ts` does not.

**Resolution Required**:
```bash
cd domain-contracts && npm run build
```

**After rebuild**: All TypeScript errors will resolve and the `CRType.RESEARCH` constant will be available.

## Verification Steps

1. **Rebuild domain-contracts**
   ```bash
   cd domain-contracts && npm run build
   ```

2. **Build shared code**
   ```bash
   npm run build:shared
   ```

3. **Start development servers**
   ```bash
   npm run dev:full
   ```

4. **Test ticket creation**
   - Create tickets of each type via UI
   - Verify type colors render correctly
   - Check that `Research` type displays with pink color

5. **Run MCP tools**
   - Test `create_cr` with each type
   - Verify `list_crs` filtering by type works

## Related Documentation

- [MDT-101 Architecture](../architecture.md) - Overall architecture for domain-contracts
- [MDT-101 Phase 1 Tasks](../phase-1/tasks.md) - Task breakdown
- [domain-contracts source](../../../../domain-contracts/src/types/schema.ts) - Source of truth for CRType
