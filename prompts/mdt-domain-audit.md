---
allowed-tools: Read, Glob, Grep, mcp__mdt-all__get_cr, mcp__mdt-all__get_project_info, mcp__mdt-all__list_crs, mcp__mdt-all__list_projects, mcp__mdt-all__manage_cr_sections, mcp__mdt-all__suggest_cr_improvements, mcp__mdt-all__update_cr_attrs, mcp__mdt-all__update_cr_status
---

# MDT Domain Audit (v1)

Analyze existing code for DDD violations. Output is a diagnostic report with severity and fix direction — not prescriptions.

**Core Principle**: Surface domain modeling problems that create maintenance burden, coupling, and inconsistency.

## User Input

```text
$ARGUMENTS
```

**Supported invocations**:
```bash
/mdt:domain-audit MDT-077                    # Audit code touched by CR
/mdt:domain-audit --path src/shared/services # Audit directory directly
/mdt:domain-audit --path src/orders,src/payments # Multiple paths
```

## Output

Creates `docs/CRs/{CR-KEY}/domain-audit.md` (with CR) or `docs/audits/domain-audit-{timestamp}.md` (standalone)

Target size: 30-50 lines

## When to Use

| Situation | Use Audit? |
|-----------|------------|
| Suspect poor domain modeling | ✅ Yes |
| Before major refactoring | ✅ Yes |
| Code feels coupled/rigid | ✅ Yes |
| Validation scattered everywhere | ✅ Yes |
| New feature, clean slate | ❌ Use `/mdt:domain-lens` instead |
| Simple CRUD with no domain logic | ❌ Skip |

## What This Detects

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
Services: ProjectService (497 lines), ProjectValidator (150 lines)
Value Objects: (none detected)
Repositories: (implicit in services)
Events: (none detected)
```

### Step 3: Detect Violations

#### 3.1 Anemic Domain Model

**Detection**:
```
entity_lines = sum(lines in entity files)
service_lines = sum(lines in service files)
ratio = service_lines / entity_lines

If ratio > 5:1 → High severity
If ratio > 3:1 → Medium severity
```

**Evidence format**:
```
Entity: Project.ts (50 lines) — getters, setters, no behavior
Service: ProjectService.ts (497 lines) — all business logic
Ratio: 10:1 (threshold: 3:1)
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
```
If service_lines > 400 → Flag for review
If service has > 15 public methods → High severity
If service touches > 5 different entities → High severity
```

**Evidence format**:
```
Service: ProjectService.ts
Lines: 497 (threshold: 400)
Public methods: 23 (threshold: 15)
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

### Step 4: Assess Severity

| Severity | Criteria | Action |
|----------|----------|--------|
| **High** | Causes bugs, blocks features, spreads on change | Fix before new features |
| **Medium** | Maintenance burden, code smell, friction | Fix in next refactoring cycle |
| **Low** | Inconsistency, minor friction | Fix opportunistically |

### Step 5: Generate Report

```markdown
# Domain Audit: {CR-KEY or path}

**Scope**: {files scanned}
**Generated**: {YYYY-MM-DD}

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | {N} |
| 🟡 Medium | {N} |
| 🟢 Low | {N} |

## Violations

### 🔴 High Severity

#### Anemic Domain Model
- **Entity**: `Project.ts` (50 lines) — data only
- **Service**: `ProjectService.ts` (497 lines) — all logic
- **Ratio**: 10:1 (threshold: 3:1)
- **Fix direction**: Move validation, state transitions, invariants into `Project`

#### {Next high severity violation}
...

### 🟡 Medium Severity

#### Missing Value Objects
- **Field**: `code: string` in `Project.ts`
- **Validation**: Found in 3 locations
- **Fix direction**: Extract `ProjectCode` value object with validation

#### {Next medium severity violation}
...

### 🟢 Low Severity

#### Language Drift
- **Domain**: "Three-Strategy Configuration"
- **Code**: `ConfigurationStrategyService`
- **Fix direction**: Align naming or document mapping

## Domain Map (Current)

| Element | Type | Lines | Notes |
|---------|------|-------|-------|
| `Project` | Entity | 50 | Anemic |
| `ProjectService` | Service | 497 | God service |
| `ProjectValidator` | Service | 150 | Validation logic |
| `ProjectConfig` | Internal | 30 | Boundary leak risk |

## Recommendations

1. **Immediate**: {highest impact fix}
2. **Next cycle**: {medium priority fixes}
3. **Opportunistic**: {low priority cleanup}

## Next Steps

To fix violations:
1. Create refactoring CR from this audit
2. Run `/mdt:domain-lens {NEW-CR}` for target domain model
3. Use `/mdt:architecture` to plan structural changes
4. Execute via `/mdt:tasks` → `/mdt:implement`

---
*Generated by /mdt:domain-audit*
```

### Step 6: Save Report

**With CR**:
1. Save to `docs/CRs/{CR-KEY}/domain-audit.md`
2. Report location in completion message

**Standalone**:
1. Create `docs/audits/` directory if needed
2. Save to `docs/audits/domain-audit-{YYYY-MM-DD-HHMMSS}.md`

### Step 7: Report Completion

```markdown
## Domain Audit Complete

**Scope**: {CR-KEY or paths}
**Output**: `{output path}`

### Violation Summary
| Severity | Count |
|----------|-------|
| 🔴 High | {N} |
| 🟡 Medium | {N} |
| 🟢 Low | {N} |

### Top Issues
1. {Highest severity issue + one-line fix direction}
2. {Second issue}
3. {Third issue}

### Next Steps
- Review full audit: `{output path}`
- Create refactoring CR if High severity issues found
- Run `/mdt:domain-lens` on refactoring CR for target model
```

---

## Examples

### Example 1: Audit via CR

**Input**: `/mdt:domain-audit MDT-077`

**Output** (`docs/CRs/MDT-077/domain-audit.md`):

```markdown
# Domain Audit: MDT-077

**Scope**: shared/services/ProjectService.ts, shared/models/Project.ts, shared/tools/*
**Generated**: 2024-12-17

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 2 |
| 🟡 Medium | 3 |
| 🟢 Low | 1 |

## Violations

### 🔴 High Severity

#### Anemic Domain Model
- **Entity**: `Project.ts` (50 lines) — data only
- **Service**: `ProjectService.ts` (497 lines) — all logic
- **Ratio**: 10:1 (threshold: 3:1)
- **Fix direction**: Move validation, state transitions into `Project`

#### God Service
- **Service**: `ProjectService.ts`
- **Lines**: 497 (threshold: 400)
- **Methods**: 23 public methods
- **Fix direction**: Split by aggregate (Project, Registry, Discovery)

### 🟡 Medium Severity

#### Missing Value Objects
- **Field**: `code: string` in `Project.ts`
- **Validation**: 3 locations
- **Fix direction**: Extract `ProjectCode` value object

#### Invariant Scatter
- **Rule**: "2-5 uppercase letters"
- **Locations**: ProjectValidator.ts, ProjectService.ts, project-cli.ts
- **Fix direction**: Single validation in `ProjectCode`

#### Missing Domain Events
- **Coupling**: ProjectService → DocumentDiscovery (direct call)
- **Fix direction**: Emit `ProjectCreated` event

### 🟢 Low Severity

#### Language Drift
- **Domain**: "Three-Strategy Configuration"
- **Code**: `ConfigurationStrategyService`
- **Fix direction**: Document mapping in glossary

## Recommendations

1. **Immediate**: Fix anemic model — move logic into `Project` aggregate
2. **Next cycle**: Extract `ProjectCode` value object, consolidate validation
3. **Opportunistic**: Add domain events for cross-context communication

---
*Generated by /mdt:domain-audit*
```

### Example 2: Standalone Audit

**Input**: `/mdt:domain-audit --path src/orders`

**Output** (`docs/audits/domain-audit-2024-12-17-143022.md`):

```markdown
# Domain Audit: src/orders

**Scope**: src/orders/**
**Generated**: 2024-12-17

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 1 |
| 🟡 Medium | 2 |
| 🟢 Low | 0 |

## Violations

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

---
*Generated by /mdt:domain-audit*
```

---

## Behavioral Rules

- **Evidence-based** — every violation has file:line references
- **Fix direction, not prescription** — "Move logic into aggregate" not "Create OrderAggregate class with methods X, Y, Z"
- **Severity guides priority** — High blocks features, Medium is friction, Low is cleanup
- **Thresholds are guidelines** — use judgment for edge cases
- **Skip if clean** — if no violations found, say so briefly

## Anti-Patterns to Avoid

❌ **Prescriptive fixes**: "Create ProjectCode class with validate() method"
✅ **Direction only**: "Extract ProjectCode value object with validation"

❌ **Audit everything**: Scan entire codebase
✅ **Focused scope**: CR artifacts or specified paths only

❌ **Verbose report**: 200 lines of analysis
✅ **Concise findings**: 30-50 lines, actionable

❌ **Opinion-based**: "This code is ugly"
✅ **Evidence-based**: "Ratio 10:1, threshold 3:1"

❌ **Perfect DDD or nothing**: Flag everything that's not textbook
✅ **Pragmatic assessment**: Focus on violations causing real problems

## Quality Checklist

Before completing, verify:
- [ ] All violations have file:line evidence
- [ ] Severity assigned to each violation
- [ ] Fix direction is actionable but not prescriptive
- [ ] Report is 30-50 lines
- [ ] Recommendations prioritized by impact
- [ ] Next steps point to MDT workflow

## Integration

**Standalone**: Run anytime on any codebase
**With CR**: Audit code touched by CR before refactoring
**Output feeds**: New refactoring CR → `/mdt:domain-lens` → `/mdt:architecture`

Context: $ARGUMENTS
