# Pre-Implementation Patterns & Development Workflow

**Purpose:** Conceptual guide for LLMs working on this codebase. Explains WHY patterns exist and WHEN to use which tools.

> This is a **living document**. As patterns emerge and decisions are made, document them here with rationale.

---

## Table of Contents

1. [Type-Safe Enum Pattern](#type-safe-enum-pattern)
2. [Verification & Validation Workflow](#verification--validation-workflow)
3. [Code Quality Tools](#code-quality-tools)
4. [Testing Strategy](#testing-strategy)
5. [Build & Development Workflow](#build--development-workflow)

---

## Type-Safe Enum Pattern

**Status:** ✅ Adopted (MDT-101 domain-contracts migration)

### The Problem

When defining enum-like values in TypeScript, you often need multiple access patterns:
1. **Named access** - `CRType.RESEARCH` for type-safe value access
2. **Array operations** - `CRTypes.includes(value)` for validation
3. **Literal type inference** - TypeScript must know exact values, not just unions

### The Solution

```typescript
// 1. Const object with named keys (single source of truth)
export const CRType = {
  ARCHITECTURE: 'Architecture',
  FEATURE_ENHANCEMENT: 'Feature Enhancement',
  BUG_FIX: 'Bug Fix',
  TECHNICAL_DEBT: 'Technical Debt',
  DOCUMENTATION: 'Documentation',
  RESEARCH: 'Research',
} as const

// 2. Explicit type (inferred from const object)
export type CRTypeValue = typeof CRType[keyof typeof CRType]

// 3. Explicit array (derives values from const object)
export const CRTypes = [
  CRType.ARCHITECTURE,
  CRType.FEATURE_ENHANCEMENT,
  CRType.BUG_FIX,
  CRType.TECHNICAL_DEBT,
  CRType.DOCUMENTATION,
  CRType.RESEARCH,
] as const
```

### Why This Works

**Explicit arrays preserve literal types:**
```typescript
// With explicit array
type T = typeof CRTypes[number]
// Type: "Architecture" | "Feature Enhancement" | "Bug Fix" | "Technical Debt" | "Documentation" | "Research"
// TypeScript knows ALL possible values at compile time

// With Object.values()
type T = typeof Object.values(CRType)
// Type: string
// TypeScript only knows "some string", loses the literal information
```

**Why explicit duplication is worth it:**
- ✅ Type-safe validation: `CRTypes.includes(value)` - TypeScript validates against all values
- ✅ Autocomplete: IDE shows all options when typing `CRTypes.`
- ✅ Order guarantees: Array order is explicit, not dependent on insertion order
- ✅ Compile-time checking: Typos are caught at build time

### Naming Convention

| Name Format | Example | Usage |
|-------------|---------|-------|
| Const object | `singular` | `CRType`, `CRPriority`, `CRStatus` |
| Type alias | `singularValue` | `CRTypeValue`, `CRPriorityValue` |
| Array | `plural` | `CRTypes`, `CRPriorities`, `CRStatuses` |

**No "All" prefix** - `CRTypes` not `AllCRTypes` for cleaner naming.

### Usage Patterns

```typescript
// Named access (default values, color mappings)
const defaultType = CRType.FEATURE_ENHANCEMENT
const typeColors = {
  [CRType.BUG_FIX]: 'bg-orange-100',
  [CRType.RESEARCH]: 'bg-pink-100',
}

// Array operations (validation, iteration, dropdowns)
if (!CRTypes.includes(ticket.type)) {
  throw new Error(`Invalid type: ${ticket.type}`)
}

const options = CRTypes.map(type => ({ value: type, label: type }))
```

### Related Decisions

- **MDT-101**: Domain contracts package as single source of truth for all CR enums
- **Type suffix**: `Value` suffix for inferred types avoids naming conflicts with const objects

---

## Verification & Validation Workflow

### Tool Hierarchy

```
Development Phase → npm run validate:ts → Build Phase → npm run build:all → Testing
                       ↓                        ↓
                  Quick TypeScript         Full compilation
                  (changed files only)      (all projects)
```

### When to Use Each Tool

| Tool | Command | When to Run | What It Checks |
|------|--------|------------|---------------|
| **TypeScript validation** | `npm run validate:ts` | After editing .ts files | Type errors, missing imports, wrong types |
| **Build all** | `npm run build:all` | Before committing | Full compilation across all projects |
| **Lint** | `npm run lint` | Before committing | Code style, formatting, best practices |
| **Knip** | `npm run knip` | Before committing | Unused code, unused dependencies |
| **Tests** | `npm run test:e2e` | Before merging | Functionality, integration |

### Validation Workflow

```bash
# 1. Make changes to TypeScript files
vim src/components/MyComponent.tsx

# 2. Quick validation (only changed files) - FAST
npm run validate:ts

# 3. If validation passes, build everything
npm run build:all

# 4. Run lint (optional but recommended)
npm run lint

# 5. Run tests if relevant changes were made
npm run test:e2e
```

### Error Resolution Priority

1. **TypeScript errors** - MUST FIX before commit
2. **Build failures** - MUST FIX before commit
3. **Lint warnings** - Fix before merging PR
4. **Knip warnings** - Evaluate: remove unused code or mark as intentional
5. **Test failures** - MUST FIX before merging

### Understanding Validation Output

```
domain-contracts (1 file)
  ✓ Validated
  ✓ src/types/schema.ts

shared (5 files)
  ✓ Validated
  ✓ models/Ticket.ts
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Projects: 3  |  Files: 10
Passed: 3  |  Failed: 0  |  Skipped: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key indicators:**
- `✓ Validated` - File has no TypeScript errors
- `✗ Failed` - TypeScript errors found (must fix)
- Project shows `Failed` if ANY file in it has errors

---

## Code Quality Tools

### ESLint (`npm run lint`)

**Purpose:** Catches code style issues, potential bugs, and anti-patterns.

**What it checks:**
- Import/export ordering (perfectionist/sort-imports)
- Unused variables and imports
- Code style consistency (semicolons, quotes, spacing)
- TypeScript-specific issues (no-redeclare, no-unsafe-assignment)

**Common fixes:**
```bash
# Auto-fix most issues
npm run lint --fix

# Fix specific file
npx eslint src/components/MyComponent.tsx --fix
```

### Knip (`npm run knip`)

**Purpose:** Detects unused code, exports, and dependencies. Reduces bundle size.

**What it finds:**
- Unused files in source
- Unused exports (dead code)
- Unused dependencies in package.json
- Unreferenced imports

**Common patterns:**
```typescript
// ❌ Dead export
export function unusedHelper() { ... }  // Never imported

// ✅ Keep with comment
/** @deprecated Use otherHelper() instead */
export function unusedHelper() { ... }
```

**Resolution:**
- Remove truly unused code
- Or mark as `@deprecated` if kept for backward compatibility

### Code Metrics (`scripts/metrics/run.sh`)

**Purpose:** Analyzes code complexity for changed TypeScript files.

**What it measures:**
- Maintainability Index (MI)
- Cyclomatic Complexity (CC)
- Cognitive Complexity (CoC)

**Color zones:**
- 🟢 Green: Healthy (MI > 20, CC < 10)
- 🟡 Yellow: Warning (MI 20-40, CC 10-20)
- 🔴 Red: Critical (MI < 20, CC > 20)

**Usage:**
```bash
# Analyze changed files
scripts/metrics/run.sh

# Analyze specific file
scripts/metrics/run.sh src/components/TicketAttributes.tsx

# Analyze directory
scripts/metrics/run.sh src/components/

# JSON output for LLM consumption
scripts/metrics/run.sh --json
```

---

## Testing Strategy

### Test Hierarchy

```
E2E Tests (Playwright)
├── Full-stack integration tests
├── Tests user workflows across browsers
└── Location: tests/e2e/

Unit Tests (Jest)
├── Server: cd server && npm test
├── MCP Server: cd mcp-server && npm test
└── Domain Contracts: cd domain-contracts && npm test
```

### When to Run Tests

| Scenario | Command | Notes |
|----------|--------|-------|
| **After UI changes** | `npm run test:e2e` | Validates visual and interaction |
| **After backend changes** | `cd server && npm test` | Unit tests for services |
| **After MCP changes** | `cd mcp-server && npm test` | Tool behavior validation |
| **Before committing** | All applicable | Ensure nothing is broken |

### Fast Iteration Mode

When debugging a single test, skip server startup:

```bash
PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/my-test.spec.ts --project=chromium
```

### Test Output Interpretation

```
✓ src/components/TicketAttributes.tsx (1 file)
✗ shared/services/TemplateService.ts (2 errors)
```

- ✓ = File passed
- ✗ = File failed (errors listed below)

---

## Build & Development Workflow

### Project Structure

```
/ (root)
├── src/              # Frontend (React + Vite)
├── server/           # Backend (Express)
├── shared/           # Shared code (compiled separately)
├── mcp-server/       # MCP Server (separate build)
└── domain-contracts/ # Domain types (single source of truth)
```

### Build Commands

| Command | Purpose | When to Run |
|---------|---------|-------------|
| `npm run dev:full` | Start dev servers | Active development |
| `npm run build` | Frontend production build | Before deploying frontend |
| `npm run build:all` | Build ALL projects | Before committing |
| `npm run build:shared` | Build shared code | After shared/ changes |
| `cd mcp-server && npm run build` | Build MCP server | After mcp-server/ changes |
| `cd domain-contracts && npm run build` | Build domain contracts | After domain-contracts/ changes |

### Development Workflow

```
1. Edit files
   ↓
2. npm run validate:ts  (quick check, changed files only)
   ↓
3. npm run build:all (full compilation)
   ↓
4. npm run lint --fix (code style)
   ↓
5. npm run test:e2e (if applicable)
   ↓
6. Commit changes
```

### Composite Projects & Dependencies

**Critical ordering:**

1. `domain-contracts` → foundational types, built first
2. `shared` → depends on `domain-contracts`
3. `server`, `mcp-server` → depend on `shared`
4. Frontend → depends on `shared`

**Build order matters** - `build:all` handles this automatically.

When making changes to `domain-contracts`, you MUST rebuild it AND rebuild dependent projects.

---

## Critical Patterns

### 1. Domain-Driven Types

**Concept:** Centralized type definitions prevent drift between frontend/backend.

```typescript
// ❌ Don't define types in multiple places
// src/types/ticket.ts - defines CRType
// server/types/ticket.ts - defines CRType (different!)

// ✅ Import from single source
import { CRType, CRTypes, type CRTypeValue } from '@mdt/domain-contracts'
```

**Why:** Ensures type consistency across the entire system.

### 2. Explicit > DRY

**Concept:** Duplicating values for better types is worth it.

```typescript
// ❌ DRY but loses type information
export const CRTypes = Object.values(CRType) as CRType[]
// Type: ("Architecture" | "Bug Fix" | ...)[]  ← union type array

// ✅ Duplicated but preserves literal types
export const CRTypes = [
  CRType.ARCHITECTURE,
  CRType.BUG_FIX,
  // ...
] as const
// Type: readonly ["Architecture", "Bug Fix", ...]  ← exact literal type
```

**Why:** Type safety is more valuable than avoiding duplication.

### 3. Validation Before Build

**Concept:** Quick TypeScript validation catches errors before expensive compilation.

```bash
# Fast (~1s) - only checks changed files
npm run validate:ts

# Slow (~30s) - compiles everything
npm run build:all
```

**Why:** Faster iteration. Don't wait for full build to catch type errors.

### 4. MCP Tools First

**Concept:** Try MCP tools before manual file operations.

**Workflow:**
1. Try `mcp__mdt-all__create_cr(...)`
2. If MCP disconnected, ask user to reconnect
3. Only use file operations as fallback

**Why:** MCP operations are atomic and validated. Manual file ops can corrupt data.

---

## Quick Reference

### Common Commands

```bash
# Validation
npm run validate:ts              # Changed files only
npm run validate:ts:all          # All TypeScript files

# Build
npm run build:all                # All projects
npm run build:shared            # Shared code only
npm run build                    # Frontend only

# Code Quality
npm run lint                    # Check style
npm run lint --fix              # Auto-fix issues
npm run knip                    # Find unused code
scripts/metrics/run.sh           # Code complexity

# Testing
npm run test:e2e                 # E2E tests
cd server && npm test           # Backend unit tests
cd mcp-server && npm test       # MCP server tests
```

### File Locations

| Entity | Location | Purpose |
|--------|----------|---------|
| Enum definitions | `domain-contracts/src/types/schema.ts` | CR types, priorities, statuses |
| Shared types | `shared/models/Types.ts` | Re-exports for backward compatibility |
| Project config | `.mdt-config.toml` | Local project configuration |
| Ticket templates | `shared/templates/` | CR templates by type |
| MCP tools | `mcp-server/src/tools/` | MCP tool implementations |

### Import Patterns

```typescript
// Domain contracts (enums)
import { CRType, CRTypes, type CRTypeValue } from '@mdt/domain-contracts'

// Shared types
import type { Ticket, TicketData } from '@mdt/shared/models/Ticket'
import { CR_STATUSES } from '@mdt/shared/models/Types'

// Services
import { MarkdownService } from '@mdt/shared/services/MarkdownService'
import { TemplateService } from '@mdt/shared/services/TemplateService'
```

---

## See Also

- **CLAUDE.md** - Project-specific guidance and conventions
- **docs/DEVELOPMENT_GUIDE.md** - Development setup and workflows
- **docs/CRs/MDT-101/**** - Domain contracts implementation details
- **docs/create_ticket.md** - Ticket/CR creation workflow
