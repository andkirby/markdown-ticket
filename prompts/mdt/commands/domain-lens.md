# MDT Domain Lens (v3)

Surface strategic DDD constraints before architectural decisions. Output is intentionally minimal — principles only, not prescriptions.

**Core Principle**: Identify domain boundaries and invariants that should constrain structural decisions downstream. All analysis MUST be grounded in actual codebase — no invented code terms.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output

Creates `{TICKETS_PATH}/{CR-KEY}/domain.md` (~15-25 lines)

## When to Use

| CR Type | Use Domain Lens? |
|---------|------------------|
| New feature with business logic | ✅ Yes |
| Complex integration across modules | ✅ Yes |
| Domain model changes | ✅ Yes |
| Simple CRUD | ❌ Skip |
| Refactoring / Tech-debt | ❌ Use `/mdt:domain-audit` instead |
| Infrastructure / Config | ❌ Skip |
| Bug fix | ❌ Skip |

## What This Is NOT

- ❌ Class/file structure recommendations (architecture's job)
- ❌ Verbose domain model documentation
- ❌ Pattern prescriptions ("use repository pattern")
- ❌ Implementation guidance
- ❌ Invented code terms from CR descriptions

## Execution Steps

### Step 1: Load Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Load `{TICKETS_PATH}/{CR-KEY}/requirements.md` if exists
3. Extract list of affected artifacts from CR

### Step 2: Ground in Codebase

**Critical**: All domain analysis MUST be grounded in actual code.

**If CR lists affected artifacts**:
1. Read each artifact file
2. Extract actual class/interface/type names
3. Note actual structure and relationships
4. Build vocabulary of real code terms

**Grounding Rules**:
- "Code Term" column MUST use actual identifiers from codebase
- If concept is new (no code exists yet), mark as `(new)`
- Do NOT invent code terms from CR descriptions
- If CR describes something like "Three-Strategy Configuration", search for actual implementation before mapping
- If unsure whether code exists, search codebase before claiming

**What to extract from code**:
| Look For | Example |
|----------|---------|
| Entity/Model classes | `class Project`, `interface ProjectConfig` |
| Service classes | `ProjectService`, `ConfigService` |
| Value objects | `class ProjectCode`, `type Email` |
| Validation patterns | `validateCode()`, `isValidPath()` |
| Event types | `ProjectCreated`, `ConfigUpdated` |

**Greenfield detection**:
- If NO affected artifacts exist yet → mark entire analysis as "Proposed model (greenfield)"
- If SOME artifacts exist → ground existing, mark new concepts as `(new)`

### Step 3: Identify Bounded Context(s)

**Question**: What business capability does this CR touch?

Look for:
- Distinct business vocabularies (same word, different meanings)
- Independent lifecycles (can this change without that?)
- Team/ownership boundaries
- Transaction boundaries

**Output format**:
```
Primary: {Context Name}
Touches: {Other Context 1}, {Other Context 2}
```

If CR stays within single context: `Primary: {Context Name}` only.

### Step 4: Identify Aggregate Boundaries

**Question**: What's the consistency boundary?

For each significant entity in CR scope:

| Concept | Role | Contains | Grounded |
|---------|------|----------|----------|
| `{Name}` | Root / Internal / Value | {children if root} | ✅ `ClassName` / (new) |

**Aggregate Root indicators**:
- Has global identity (ID referenced externally)
- Enforces invariants across children
- Transaction boundary
- Entry point for operations

**Internal Entity indicators**:
- Identity only meaningful within aggregate
- Cannot be modified without going through root
- Lifecycle tied to root

**Value Object indicators**:
- No identity, only attributes
- Immutable
- Interchangeable if attributes equal

**Exclusion indicators** (NOT aggregates):
- External library types (npm packages, framework classes)
- Internal data structures (Maps, Sets, arrays)
- Configuration/option objects (unless they enforce domain rules)
- Implementation details (DTOs, utility types, primitive wrappers)

### Step 5: Surface Invariants

**Question**: What business rules must ALWAYS be true?

| Invariant | Scope | Enforcement |
|-----------|-------|-------------|
| `{rule in plain English}` | `{Aggregate}` | In aggregate / At boundary / Via event |

**What IS an invariant** (include):
- Business rules: "Order total must equal sum of line items"
- Domain constraints: "Project code must be unique"
- State rules: "Cannot ship cancelled order"

**What is NOT an invariant** (exclude):
- Technical configs: "Cache TTL is 30 seconds"
- Implementation details: "Store in TOML format"
- Performance requirements: "Must respond in 2 seconds"

**Enforcement guidance**:
- **In aggregate**: Rule involves only data within one aggregate
- **At boundary**: Rule checked on entry to bounded context
- **Via event**: Rule spans aggregates, enforce eventually

### Step 6: Note Language Alignment

**Question**: Does CR terminology match code terminology?

| CR/Requirements Term | Code Term | Status |
|---------------------|-----------|--------|
| `{term from CR}` | `{actual identifier}` | ✅ Aligned / ⚠️ Drift / (new) |

**Rules**:
- "Code Term" MUST be actual identifier found in code
- If code doesn't exist yet, use `(new)` not an invented name
- Only note significant mismatches, skip trivial differences
- Omit section entirely if no mismatches and no new terms

**Examples**:
| CR Term | Code Term | Status |
|---------|-----------|--------|
| "Project" | `Project` class | ✅ Aligned |
| "Three-Strategy Config" | `(new)` | (new) — no implementation yet |
| "User Profile" | `Account` class | ⚠️ Drift |

### Step 7: Flag Cross-Context Operations

**Question**: Does this CR require coordination across bounded contexts?

| Operation | From | To | Pattern |
|-----------|------|----|---------|
| `{what happens}` | `{Context A}` | `{Context B}` | Event / Service / Saga |

**Pattern guidance**:
- **Event**: Fire-and-forget, eventual consistency OK
- **Service**: Synchronous call needed, query or command
- **Saga**: Multi-step, compensating transactions needed

### Step 8: Generate Output

Create `{TICKETS_PATH}/{CR-KEY}/domain.md`:

```markdown
# Domain Constraints: {CR-KEY}

**Context**: {Primary context} {→ touches: X, Y if applicable}
{If greenfield: **Status**: Proposed model (greenfield — no existing code)}

## Aggregates

| Concept | Role | Contains | Grounded |
|---------|------|----------|----------|
| `{Name}` | Root | {children} | ✅ `ClassName` |
| `{Name}` | Internal | — | (new) |
| `{Name}` | Value | — | ✅ `TypeName` |

## Invariants

| Rule | Scope | Enforce |
|------|-------|---------|
| {plain English business rule} | `{Aggregate}` | {where} |

## Language

| CR Term | Code Term | Status |
|---------|-----------|--------|
| {term} | `{actual code}` or (new) | {status} |

{Only if mismatches or new terms exist, otherwise omit section}

## Cross-Context

| Operation | Contexts | Pattern |
|-----------|----------|---------|
| {operation} | A → B | {pattern} |

{Only if cross-context operations exist, otherwise omit section}

---
*Generated by /mdt:domain-lens — constraints for /mdt:architecture*
```

**Target size**: 15-25 lines. If output exceeds 30 lines, you're over-specifying.

### Step 9: Report Completion

```markdown
## Domain Analysis Complete

**CR**: {CR-KEY}
**Output**: `{TICKETS_PATH}/{CR-KEY}/domain.md`
**Grounding**: {Fully grounded / Partially grounded / Greenfield}

**Context**: {Primary} {→ touches if any}
**Aggregates**: {count} ({N} grounded, {M} new)
**Invariants**: {count}
**Cross-Context Operations**: {count or "None"}

### Key Constraints for Architecture
{1-3 bullet points summarizing what architecture should respect}

### Next Steps
- Review domain constraints
- Run `/mdt:architecture {CR-KEY}` — will consume domain.md
```

---

## Examples

### Example 1: Grounded Analysis (Existing Code)

```markdown
# Domain Constraints: MDT-077

**Context**: Project Management → touches: Configuration Storage

## Aggregates

| Concept | Role | Contains | Grounded |
|---------|------|----------|----------|
| `Project` | Root | Config, Registry | ✅ `Project` class |
| `ProjectConfig` | Internal | — | ✅ `ProjectConfig` interface |
| `ProjectCode` | Value | — | (new) — currently `string` |

## Invariants

| Rule | Scope | Enforce |
|------|-------|---------|
| Project code must be 2-5 uppercase letters | `Project` | In aggregate |
| Project ID must match directory name | `Project` | At boundary |

## Language

| CR Term | Code Term | Status |
|---------|-----------|--------|
| Three-Strategy Configuration | (new) | No implementation yet |
| Project | `Project` class | ✅ Aligned |

---
*Generated by /mdt:domain-lens*
```

### Example 2: Greenfield Feature

```markdown
# Domain Constraints: MDT-099

**Context**: Payment Processing → touches: Order Management
**Status**: Proposed model (greenfield — no existing code)

## Aggregates

| Concept | Role | Contains | Grounded |
|---------|------|----------|----------|
| `Payment` | Root | Transactions | (new) |
| `Transaction` | Internal | — | (new) |
| `Money` | Value | — | (new) |

## Invariants

| Rule | Scope | Enforce |
|------|-------|---------|
| Payment total must equal order total | `Payment` | At boundary |
| Refund cannot exceed original payment | `Payment` | In aggregate |

## Cross-Context

| Operation | Contexts | Pattern |
|-----------|----------|---------|
| Capture payment | Payment → Order | Event |

---
*Generated by /mdt:domain-lens*
```

### Example 3: Simple Feature (Minimal Output)

```markdown
# Domain Constraints: MDT-043

**Context**: User Profile

## Aggregates

| Concept | Role | Contains | Grounded |
|---------|------|----------|----------|
| `UserProfile` | Root | Preferences | ✅ `UserProfile` class |

## Invariants

| Rule | Scope | Enforce |
|------|-------|---------|
| Email must be unique | `UserProfile` | At boundary |

---
*Generated by /mdt:domain-lens*
```

---

## Behavioral Rules

- **Minimal output** — 15-25 lines target, 30 max
- **Grounded in code** — all code terms from actual codebase
- **Mark new concepts** — use `(new)` not invented names
- **Principles not prescriptions** — "Order is aggregate root" not "Create OrderRepository"
- **Business invariants only** — no technical configs or performance requirements
- **Skip empty sections** — no Language section if no mismatches
- **One context focus** — if CR spans many contexts, focus on primary
- **No file paths** — that's architecture's job
- **No size limits** — that's architecture's job

## Anti-Patterns to Avoid

❌ **Invented code terms**: "ConfigurationStrategyService" (doesn't exist in code)
✅ **Actual code terms**: `ProjectService` or `(new)` if not implemented

❌ **Technical constraints as invariants**: "Cache TTL must be 30 seconds"
✅ **Business invariants**: "Project code must be unique"

❌ **Verbose domain model**: Pages of entity descriptions
✅ **Constraint summary**: Just boundaries and rules

❌ **Pattern prescription**: "Use Repository pattern for Order"
✅ **Boundary identification**: "Order is aggregate root"

❌ **Implementation leakage**: "OrderService should call InventoryClient"
✅ **Coordination flag**: "Order → Inventory needs event pattern"

❌ **Hallucinated mappings**: CR says "Three-Strategy" → invent "StrategyService"
✅ **Honest mapping**: CR says "Three-Strategy" → `(new)` or actual class if exists

❌ **Library types as aggregates**: External package types, data structures
✅ **Domain concepts only**: Wrappers around libraries, entities with behavior

## Quality Checklist

Before completing, verify:
- [ ] Output ≤ 30 lines
- [ ] All code terms verified against actual codebase
- [ ] New concepts marked with `(new)`, not invented names
- [ ] Grounding status noted (fully/partially/greenfield)
- [ ] Invariants are business rules, not technical constraints
- [ ] No file paths or structure recommendations
- [ ] No pattern prescriptions
- [ ] Aggregates have clear Root/Internal/Value roles
- [ ] Aggregates represent domain concepts, not library types or implementation details
- [ ] Cross-context operations flagged with coordination pattern
- [ ] Empty sections omitted

## Integration

**Before**: CR exists, optionally requirements.md exists
**After**: `/mdt:architecture` consumes domain.md as constraints

**Related workflows**:
- `/mdt:domain-audit` — analyze existing code for DDD violations (use instead for refactoring)

Context: $ARGUMENTS
