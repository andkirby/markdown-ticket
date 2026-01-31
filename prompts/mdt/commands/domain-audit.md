---
allowed-tools: Read, Glob, Grep, mcp__mdt-all__get_cr, mcp__mdt-all__get_project_info, mcp__mdt-all__list_crs, mcp__mdt-all__list_projects, mcp__mdt-all__manage_cr_sections, mcp__mdt-all__suggest_cr_improvements, mcp__mdt-all__update_cr_attrs, mcp__mdt-all__update_cr_status
---

# MDT Domain Audit (v2)

Analyze existing code for DDD violations AND structural issues. Output is a diagnostic report with severity and fix direction — not prescriptions.

**Core Principle**: Surface domain modeling problems AND structural cohesion issues that create maintenance burden, coupling, and inconsistency.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

**Supported invocations**:
```bash
/mdt:domain-audit MDT-077                    # Audit code touched by CR
/mdt:domain-audit --path src/shared/services # Audit directory directly
/mdt:domain-audit --path src/orders,src/payments # Multiple paths
```

## Output

Creates `{TICKETS_PATH}/{CR-KEY}/domain-audit.md` (with CR) or `docs/audits/domain-audit-{timestamp}.md` (standalone)

Keep the report concise: prioritize high-severity issues and actionable fixes.

## When to Use

| Situation | Use Audit? |
|-----------|------------|
| Suspect poor domain modeling | ✅ Yes |
| Before major refactoring | ✅ Yes |
| Code feels coupled/rigid | ✅ Yes |
| Validation scattered everywhere | ✅ Yes |
| Related code scattered across directories | ✅ Yes |
| Suspect layer violations | ✅ Yes |
| New feature, clean slate | ❌ Use `/mdt:domain-lens` instead |
| Simple CRUD with no domain logic | ❌ Skip |

## What This Detects

### DDD Violations

| Violation | Signal | Severity |
|-----------|--------|----------|
| Anemic domain model | Entities = data bags, services = all logic | High |
| Aggregate boundary leak | Internal entities accessed directly | High |
| Missing value objects | Primitives for domain concepts | Medium |
| Invariant scatter | Same rule validated in multiple places | Medium |
| Wrong aggregate root | Operations bypass natural entry point | High |
| Cross-aggregate transaction | Multiple aggregates in one atomic operation | High |
| Missing domain events | Tight coupling where events belong | Medium |
| Language drift | Code terms ≠ ubiquitous language | Low |
| God service | Single service doing everything | High |
| Feature envy | Service knows too much about entity internals | Medium |

### Structural Issues

| Issue | Signal | Severity |
|-------|--------|----------|
| Layer violation | Presentation in utils, domain in infrastructure | High |
| Scattered cohesion | Related concepts spread across directories | High |
| Mixed responsibility | Single file with multiple unrelated concerns | Medium |
| Dependency direction | Utils depending on handlers, cycles | High |
| Orphan utilities | Helpers that belong with their consumers | Medium |

## What This Is NOT

- ❌ Full domain model documentation
- ❌ Class/file restructuring plan (architecture's job)
- ❌ Pattern prescriptions ("use Repository pattern")
- ❌ Code review or style critique

## Execution Steps

### Step 1: Determine Scope

**With CR**:
1. `mdt-all:get_cr` with `mode="full"`
2. Extract affected artifacts from CR
3. Scan those files + their direct dependencies

**With --path**:
1. Parse path argument (comma-separated for multiple)
2. Scan all code files in specified paths
3. Include imported/required dependencies one level deep

### Step 2: Build Domain Map

Scan code to identify:

| Element | Detection Method |
|---------|------------------|
| Entities | Classes with ID/identity, persisted |
| Value Objects | Immutable classes, equality by attributes |
| Services | Classes with business logic, no identity |
| Repositories | Data access abstractions |
| Events | Classes representing domain occurrences |

**Output** (internal, not in report):
```
Entities: Project, User, Order
Services: ProjectService (primary business logic), ProjectValidator (validation)
Value Objects: (none detected)
Repositories: (implicit in services)
Events: (none detected)
```

### Step 2.5: Build Dependency Graph

Parse imports/requires to build dependency relationships:

1. For each file in scope, extract imports
2. Build directed graph: `A imports B` → `A → B`
3. Identify:
   - Inbound dependencies (who depends on this?)
   - Outbound dependencies (what does this depend on?)
   - Cycles (A → B → C → A)
   - Layer crossings (utils → handlers, domain → infrastructure)

**Output** (internal, for analysis):
```
ModifyOperation.ts
  → CRFileReader (utils/)
  → SectionResolver (utils/)
  → ValidationFormatter (utils/) ← contains presentation
  → CRService (services/)
  
ValidationFormatter.ts
  → SectionMatch (shared/)
  → Sanitizer (utils/)
```

### Step 3: Detect DDD Violations

#### 3.1 Anemic Domain Model

**Detection**:
- Entities are data-only (getters/setters, no behavior)
- Services own most business rules and validations
- Aggregates don't encapsulate invariants

**Evidence format**:
```
Entity: Project.ts — data-only (getters/setters, no behavior)
Service: ProjectService.ts — most business logic and validations
```

#### 3.2 Aggregate Boundary Leak

**Detection**:
- Find entities that "belong" to aggregates (internal)
- Check if external code imports/accesses them directly
- Flag direct instantiation or modification outside aggregate

**Evidence format**:
```
Internal: ProjectConfig (should be accessed via Project)
Leak: ConfigLoader.ts:45 — directly modifies ProjectConfig
```

#### 3.3 Missing Value Objects

**Detection**:
- Find primitive fields that represent domain concepts
- Signals: validation logic nearby, formatting/parsing, semantic meaning

**Evidence format**:
```
Field: code: string (in Project.ts)
Validation: validateCode() called in 3 locations
Concept: ProjectCode (2-5 uppercase letters)
```

#### 3.4 Invariant Scatter

**Detection**:
- Find identical or near-identical validation logic
- Check for same regex/rules in multiple files
- Count occurrences

**Evidence format**:
```
Rule: "Project code must be 2-5 uppercase letters"
Locations: ProjectValidator.ts:23, ProjectService.ts:156, project-cli.ts:89
Count: 3 (should be 1)
```

#### 3.5 Wrong Aggregate Root

**Detection**:
- Find operations that modify entities without going through parent
- Check for "orphan" operations on internal entities

**Evidence format**:
```
Entity: RegistryEntry (internal to Project)
Operation: updateRegistry() modifies RegistryEntry directly
Expected: Project.updateRegistry() should be entry point
```

#### 3.6 Cross-Aggregate Transaction

**Detection**:
- Find functions that modify multiple aggregates
- Check for atomic operations spanning aggregate boundaries

**Evidence format**:
```
Function: createProjectWithDocuments()
Modifies: Project (aggregate), DocumentTree (aggregate)
Issue: Should use domain events for eventual consistency
```

#### 3.7 Missing Domain Events

**Detection**:
- Find direct calls between bounded contexts
- Check for tight coupling where events would decouple

**Evidence format**:
```
Coupling: ProjectService.ts:234 calls DocumentDiscovery.scan() directly
Contexts: Project Management → Document Discovery
Pattern: Should emit ProjectCreated event, DocumentDiscovery subscribes
```

#### 3.8 Language Drift

**Detection**:
- Compare terms in documentation/CR vs code identifiers
- Flag significant mismatches

**Evidence format**:
```
Domain term: "Three-Strategy Configuration"
Code term: ConfigurationStrategyService, StrategyType enum
Drift: Moderate — concept exists but naming diverges
```

#### 3.9 God Service

**Detection**:
- Service owns multiple distinct responsibilities
- Service has many public methods
- Service touches many entities across aggregates

**Evidence format**:
```
Service: ProjectService.ts
Signals: orchestration + validation + persistence + cross-aggregate coordination
Public methods: 23
Entities touched: Project, Config, Registry, Cache, Validator
```

#### 3.10 Feature Envy

**Detection**:
- Service methods that mostly access one entity's data
- Logic that "should" live in the entity

**Evidence format**:
```
Method: ProjectService.calculateProjectStats()
Accesses: project.name, project.code, project.config, project.registry (4 fields)
Suggestion: Move to Project.getStats()
```

### Step 4: Detect Structural Issues

#### 4.1 Layer Violation

**Detection**:
- Identify file's layer from location:
  - `handlers/`, `controllers/`, `routes/` → Presentation/Interface
  - `services/`, `domain/` → Domain/Business Logic
  - `utils/`, `shared/`, `common/` → Infrastructure/Utilities
  - `repositories/`, `data/` → Data Access
- Check if content matches expected layer:
  - Presentation: HTTP handling, CLI output, formatted responses
  - Domain: Business rules, entities, value objects
  - Utils: Generic helpers, no domain or presentation specifics

**Signals of violation**:
- Utils file returns formatted markdown/HTML/CLI output
- Utils file imports from handlers/controllers
- Domain file imports presentation libraries
- Repository contains business rules

**Evidence format**:
```
File: utils/section/ValidationFormatter.ts
Location layer: Utils/Infrastructure
Contains: formatModifyOutput() — tool-specific markdown with emoji ✅
Actual layer: Presentation
Fix direction: Move to handlers/sections/SectionPresenter.ts
```

#### 4.2 Scattered Cohesion

**Detection**:
- Find files with related names/concepts
- Check if they're co-located or scattered
- Look for:
  - Same prefix/suffix in different directories
  - Files that always change together (conceptually)
  - Imports that form a cluster

**Signals**:
- `utils/section/CRFileReader.ts` + `utils/section/SectionResolver.ts` + `handlers/operations/ModifyOperation.ts` — all about sections but scattered
- Files with same domain concept in 3+ different directories

**Evidence format**:
```
Concept: Section manipulation
Scattered across:
  - utils/section/CRFileReader.ts
  - utils/section/SectionResolver.ts
  - utils/section/ValidationFormatter.ts
  - utils/simpleSectionValidator.ts
  - utils/simpleContentProcessor.ts
  - handlers/operations/ModifyOperation.ts
Count: 6 files in 3 directories
Fix direction: Consolidate to handlers/sections/
```

#### 4.3 Mixed Responsibility

**Detection**:
- Single file with multiple unrelated method groups
- Methods that don't call each other
- Class doing orchestration AND business logic AND formatting

**Signals**:
- Distinct "sections" of functionality in the same file
- Constructor with 5+ dependencies of different types
- Methods grouped by concern that don't interact

**Evidence format**:
```
File: ModifyOperation.ts
Responsibilities detected:
  1. Orchestration — coordinate read/validate/write flow
  2. Business logic — header rename detection (see file:line)
  3. Content processing — coordinate sanitization
Count: 3 distinct responsibilities
Fix direction: Extract HeaderRenamer utility, keep orchestration only
```

#### 4.4 Dependency Direction

**Detection**:
- Parse import graph from Step 2.5
- Check for violations:
  - Cycles: A → B → C → A
  - Upward dependencies: utils → handlers, infrastructure → domain
  - Skip violations: lower layer reaching up

**Layer order** (lower should not import higher):
```
1. Presentation (handlers, controllers, CLI)
2. Application (use cases, orchestration)
3. Domain (entities, services, value objects)
4. Infrastructure (utils, repositories, external)
```

**Evidence format**:
```
Cycle detected:
  ServiceA.ts → ServiceB.ts → ServiceC.ts → ServiceA.ts

Direction violation:
  utils/ValidationFormatter.ts imports types from handlers/
  Expected: handlers import from utils, not reverse
  
Severity: High (cycles), Medium (direction)
```

#### 4.5 Orphan Utilities

**Detection**:
- Utils that are only used by one consumer
- Helpers that contain domain-specific logic
- Files in `utils/` that belong with their single consumer

**Signals**:
- `utils/section/*` only imported by `handlers/sections/*`
- Utility with domain-specific naming (e.g., `CRFileReader`)

**Evidence format**:
```
Orphan: utils/section/CRFileReader.ts
Used by: Only handlers/operations/ModifyOperation.ts (and related)
Contains: CR-specific file reading logic
Fix direction: Move to handlers/sections/ with its consumers
```

### Step 5: Extract Domain Concept

After analyzing violations and structure, synthesize:

1. **Core Domain**: What is this code fundamentally about?
2. **Operations**: What actions can be performed?
3. **Current State**: How cohesive is the current structure?
4. **Natural Grouping**: What should live together?

**Output format**:
```markdown
## Domain Concept

**Core Domain**: Section Manipulation
**Operations**: find, read, modify (replace/append/prepend), format output
**Current State**: Scattered (6 files, 3 directories)
**Natural Grouping**:
```
handlers/sections/
├── SectionService.ts      # Core: find, read, modify
├── SectionPresenter.ts    # Format tool output  
└── models.ts              # SectionMatch, ModifyResult
```
```

### Step 6: Assess Severity

| Severity | Criteria | Action |
|----------|----------|--------|
| **High** | Causes bugs, blocks features, spreads on change | Fix before new features |
| **Medium** | Maintenance burden, code smell, friction | Fix in next refactoring cycle |
| **Low** | Inconsistency, minor friction | Fix opportunistically |

### Step 7: Generate Report

```markdown
# Domain Audit: {CR-KEY or path}

**Scope**: {files scanned}
**Generated**: {YYYY-MM-DD}

## Summary

| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | {N} | {N} | {N} |
| Structural Issues | {N} | {N} | {N} |

## DDD Violations

### 🔴 High Severity

#### {Violation Type}
- **Evidence**: {specific file:line references}
- **Impact**: {why this matters}
- **Fix direction**: {what to do, not how}

### 🟡 Medium Severity
...

### 🟢 Low Severity
...

## Structural Issues

### 🔴 High Severity

#### Layer Violation
- **File**: `{path}`
- **Location layer**: {where it lives}
- **Actual layer**: {what it contains}
- **Fix direction**: Move to {appropriate location}

#### Scattered Cohesion
- **Concept**: {what's scattered}
- **Scattered across**: {list of locations}
- **Fix direction**: Consolidate to {single location}

### 🟡 Medium Severity

#### Mixed Responsibility
- **File**: `{path}`
- **Responsibilities**: {list}
- **Fix direction**: Extract {what} to {where}

## Dependency Analysis

```
{Primary file}
  ├── {dependency} ({location})
  ├── {dependency} ({location}) ← {issue if any}
  └── {dependency} ({location})
```

{Note any cycles or direction violations}

## Domain Concept

**Core Domain**: {what this code is about}
**Operations**: {what can be done}
**Current State**: {Scattered / Partially cohesive / Cohesive}
**Natural Grouping**:
```
{suggested structure}
```

## Recommendations

1. **Immediate**: {highest impact fix}
2. **Next cycle**: {medium priority fixes}
3. **Opportunistic**: {low priority cleanup}

## Next Steps

To fix violations:
1. Create refactoring CR from this audit
2. Run `/mdt:architecture {CR-KEY} --prep` to design the fix
3. Execute via `/mdt:tasks` → `/mdt:implement`

---
*Generated by /mdt:domain-audit v2*
```

### Step 8: Save Report

**With CR**:
1. Save to `{TICKETS_PATH}/{CR-KEY}/domain-audit.md`
2. Report location in completion message

**Standalone**:
1. Create `docs/audits/` directory if needed
2. Save to `docs/audits/domain-audit-{YYYY-MM-DD-HHMMSS}.md`

### Step 9: Report Completion

```markdown
## Domain Audit Complete

**Scope**: {CR-KEY or paths}
**Output**: `{output path}`

### Summary
| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | {N} | {N} | {N} |
| Structural Issues | {N} | {N} | {N} |

### Top Issues
1. {Highest severity issue + one-line fix direction}
2. {Second issue}
3. {Third issue}

### Domain Concept
**Core**: {what this code is about}
**State**: {Scattered / Partially cohesive / Cohesive}

### Next Steps
- Review full audit: `{output path}`
- Create refactoring CR if High severity issues found
- Run `/mdt:architecture {CR-KEY} --prep` to design fix
```

---

## Examples

### Example 1: Audit with Structural Issues (MDT-114 style)

**Input**: `/mdt:domain-audit MDT-114`

**Output** (`{TICKETS_PATH}/MDT-114/domain-audit.md`):

```markdown
# Domain Audit: MDT-114

**Scope**: mcp-server/src/tools/handlers/**, mcp-server/src/utils/section/**
**Generated**: 2026-01-03

## Summary

| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | 1 | 1 | 0 |
| Structural Issues | 2 | 1 | 0 |

## DDD Violations

### 🔴 High Severity

#### God Service
- **File**: `ModifyOperation.ts`
- **Methods**: 1 execute() with large internal body
- **Dependencies**: 9 constructor parameters
- **Fix direction**: Break into focused components

### 🟡 Medium Severity

#### Feature Envy
- **Method**: `ModifyOperation.execute()` (see file:line)
- **Accesses**: headerLevel, headerText, content from SectionMatch
- **Fix direction**: Extract HeaderRenamer utility

## Structural Issues

### 🔴 High Severity

#### Layer Violation
- **File**: `utils/section/ValidationFormatter.ts`
- **Location layer**: Utils/Infrastructure
- **Contains**: `formatModifyOutput()` — tool-specific markdown with ✅ emoji
- **Actual layer**: Presentation
- **Fix direction**: Move to handlers/sections/SectionPresenter.ts

#### Scattered Cohesion
- **Concept**: Section manipulation
- **Scattered across**:
  - `utils/section/CRFileReader.ts`
  - `utils/section/SectionResolver.ts`
  - `utils/section/ValidationFormatter.ts`
  - `utils/simpleSectionValidator.ts`
  - `utils/simpleContentProcessor.ts`
  - `handlers/operations/ModifyOperation.ts`
- **Count**: 6 files in 3 directories
- **Fix direction**: Consolidate to handlers/sections/

### 🟡 Medium Severity

#### Mixed Responsibility
- **File**: `ModifyOperation.ts`
- **Responsibilities**:
  1. Orchestration (read → validate → write)
  2. Business logic (header rename detection)
  3. Content processing coordination
- **Fix direction**: Extract HeaderRenamer, keep orchestration only

## Dependency Analysis

```
ModifyOperation.ts (handlers/operations/)
  ├── CRFileReader (utils/section/)
  ├── SectionResolver (utils/section/)
  ├── ValidationFormatter (utils/section/) ← LAYER VIOLATION
  ├── SimpleSectionValidator (utils/)
  ├── SimpleContentProcessor (utils/)
  ├── MarkdownSectionService (shared/)
  ├── MarkdownService (shared/)
  └── CRService (services/)
```

No cycles detected.
Direction issue: utils/ValidationFormatter contains presentation logic.

## Domain Concept

**Core Domain**: Section Manipulation
**Operations**: find, read, modify (replace/append/prepend), format output
**Current State**: Scattered (6 files, 3 directories)
**Natural Grouping**:
```
handlers/sections/
├── SectionService.ts      # Core: find, read, modify
├── SectionPresenter.ts    # Format tool output (from ValidationFormatter)
├── SectionHandlers.ts     # MCP tool interface
└── models.ts              # SectionMatch, ModifyResult
```

## Recommendations

1. **Immediate**: Fix layer violation — move ValidationFormatter → SectionPresenter
2. **Immediate**: Consolidate scattered section logic into handlers/sections/
3. **Next cycle**: Extract HeaderRenamer from ModifyOperation

---
*Generated by /mdt:domain-audit v2*
```

### Example 2: Clean DDD Audit (minimal structural issues)

**Input**: `/mdt:domain-audit MDT-077`

**Output** (`{TICKETS_PATH}/MDT-077/domain-audit.md`):

```markdown
# Domain Audit: MDT-077

**Scope**: shared/services/ProjectService.ts, shared/models/Project.ts
**Generated**: 2024-12-17

## Summary

| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | 2 | 2 | 1 |
| Structural Issues | 0 | 0 | 0 |

## DDD Violations

### 🔴 High Severity

#### Anemic Domain Model
- **Entity**: `Project.ts` — data only
- **Service**: `ProjectService.ts` — most business logic
- **Fix direction**: Move validation, state transitions into `Project`

#### God Service
- **Service**: `ProjectService.ts`
- **Methods**: 23 public methods
- **Fix direction**: Split by aggregate (Project, Registry, Discovery)

### 🟡 Medium Severity

#### Missing Value Objects
- **Field**: `code: string` in `Project.ts`
- **Validation**: Found in 3 locations
- **Fix direction**: Extract `ProjectCode` value object

#### Invariant Scatter
- **Rule**: "2-5 uppercase letters"
- **Locations**: ProjectValidator.ts, ProjectService.ts, project-cli.ts
- **Fix direction**: Single validation in `ProjectCode`

### 🟢 Low Severity

#### Language Drift
- **Domain**: "Three-Strategy Configuration"
- **Code**: `ConfigurationStrategyService`
- **Fix direction**: Document mapping in glossary

## Structural Issues

No structural issues detected. Code is well-organized by layer.

## Domain Concept

**Core Domain**: Project Management
**Operations**: create, validate, configure, discover documents
**Current State**: Cohesive (single directory)
**Natural Grouping**: Already correct — focus on DDD fixes

## Recommendations

1. **Immediate**: Fix anemic model — move logic into `Project` aggregate
2. **Next cycle**: Extract `ProjectCode` value object, consolidate validation
3. **Opportunistic**: Document language mapping

---
*Generated by /mdt:domain-audit v2*
```

### Example 3: Standalone Path Audit

**Input**: `/mdt:domain-audit --path src/orders`

**Output** (`docs/audits/domain-audit-2024-12-17-143022.md`):

```markdown
# Domain Audit: src/orders

**Scope**: src/orders/**
**Generated**: 2024-12-17

## Summary

| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | 1 | 2 | 0 |
| Structural Issues | 1 | 0 | 0 |

## DDD Violations

### 🔴 High Severity

#### Cross-Aggregate Transaction
- **Function**: `createOrderWithPayment()`
- **Modifies**: Order, Payment, Inventory
- **Fix direction**: Use saga pattern or domain events

### 🟡 Medium Severity

#### Aggregate Boundary Leak
- **Internal**: `OrderLineItem`
- **Leak**: `ReportService.ts:78` accesses line items directly
- **Fix direction**: Access via `Order.getLineItems()`

#### Feature Envy
- **Method**: `OrderService.calculateTotal()`
- **Accesses**: 5 fields from Order
- **Fix direction**: Move to `Order.calculateTotal()`

## Structural Issues

### 🔴 High Severity

#### Dependency Direction
- **Violation**: `src/orders/utils/orderHelper.ts` imports from `src/orders/handlers/`
- **Expected**: Utils should not depend on handlers
- **Fix direction**: Move helper logic into handler or domain layer

## Domain Concept

**Core Domain**: Order Processing
**Operations**: create, calculate totals, process payment, manage line items
**Current State**: Partially cohesive (minor dependency issue)
**Natural Grouping**: Mostly correct

## Recommendations

1. **Immediate**: Fix cross-aggregate transaction with domain events
2. **Next cycle**: Fix dependency direction in orderHelper
3. **Next cycle**: Move calculateTotal into Order entity

---
*Generated by /mdt:domain-audit v2*
```

---

## Behavioral Rules

- **Evidence-based** — every violation has file:line references
- **Fix direction, not prescription** — "Move logic into aggregate" not "Create OrderAggregate class with methods X, Y, Z"
- **Severity guides priority** — High blocks features, Medium is friction, Low is cleanup
- **Signals are guidelines** — use judgment for edge cases
- **Skip if clean** — if no violations found, say so briefly
- **Both DDD and structural** — always check both categories
- **Domain concept required** — always synthesize what the code is about

## Anti-Patterns to Avoid

❌ **Prescriptive fixes**: "Create ProjectCode class with validate() method"
✅ **Direction only**: "Extract ProjectCode value object with validation"

❌ **Audit everything**: Scan entire codebase
✅ **Focused scope**: CR artifacts or specified paths only

❌ **Verbose report**: long narrative without decisions
✅ **Concise findings**: actionable, prioritized issues

❌ **Opinion-based**: "This code is ugly"
✅ **Evidence-based**: "Entities are data-only; services own the behavior"

❌ **Perfect DDD or nothing**: Flag everything that's not textbook
✅ **Pragmatic assessment**: Focus on violations causing real problems

❌ **DDD only**: Ignore structural issues
✅ **Holistic view**: Check both domain modeling AND code organization

❌ **Skip domain concept**: Just list violations
✅ **Synthesize understanding**: What is this code fundamentally about?

## Quality Checklist

Before completing, verify:
- [ ] All violations have file:line evidence
- [ ] Severity assigned to each violation
- [ ] Fix direction is actionable but not prescriptive
- [ ] Report is concise and prioritized
- [ ] Recommendations prioritized by impact
- [ ] Both DDD violations AND structural issues checked
- [ ] Dependency analysis included
- [ ] Domain Concept section synthesized
- [ ] Natural grouping suggested
- [ ] Next steps point to MDT workflow

## Integration

**Standalone**: Run anytime on any codebase
**With CR**: Audit code touched by CR before refactoring
**Output feeds**: `/mdt:architecture --prep` consumes audit findings

**Workflow position**:
```
/mdt:assess
    │
    └─► "⚠️ Prep Required" or refactoring CR
        │
        ▼
/mdt:domain-audit {CR-KEY} ─── Diagnoses DDD + structural issues
        │                      Extracts domain concept
        │                      Suggests natural grouping
        ▼
/mdt:architecture {CR-KEY} --prep ─── Consumes audit
        │                             Designs fix based on findings
        ▼
/mdt:tasks → /mdt:implement
```

Context: $ARGUMENTS
