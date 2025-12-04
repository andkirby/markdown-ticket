# MDT Architecture Design Workflow (v2)

Surface architectural decisions before implementation. Produces `## Architecture Design` section with Pattern, Shared Patterns, Structure, Size Guidance, and Extension Rule.

**Core Principle**: Surface decisions LLM would otherwise make implicitly — including size constraints and shared patterns.

## User Input

```text
$ARGUMENTS
```

## Problem This Solves

Without explicit architecture design, LLMs make implicit structural decisions:
- Horizontal vs. vertical organization (e.g., duplicated blocks across layers)
- Single file vs. multiple files
- Inheritance vs. composition
- Centralized vs. distributed logic

These implicit decisions accumulate technical debt. This workflow surfaces them for human review **before** code generation.

## When to Use

Use this workflow when:
- CR involves multiple similar things (providers, handlers, adapters)
- CR introduces new abstraction or extension point
- CR affects code organization across files/modules
- Previous implementation attempts produced poor structure

Do NOT use when:
- Simple bug fix with clear single-file scope
- Documentation-only change
- CR already has explicit architecture in problem statement

## Execution Steps

### Step 1: Load Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract from CR:
   - Problem statement (what's being solved)
   - Affected artifacts (existing files/components)
   - New artifacts (planned files/components)
   - Scope boundaries (what changes, what doesn't)
3. Check for project CLAUDE.md — may have project-specific size limits
4. Scan for architectural signals:
   - Multiple similar items (providers, handlers, commands)
   - Words: "adapter", "factory", "provider", "handler", "strategy"
   - Patterns: "for each X", "multiple Y", "extensible"

### Step 2: Identify Shared Patterns

**Before designing structure**, scan for repeated logic:

```markdown
| Pattern | Where It Appears | Extract To |
|---------|------------------|------------|
| Input validation | command1, command2, command3 | `validators/` |
| Error handling | all handlers | `utils/error-handler` |
| Silent mode | CLI, config | `utils/silent-mode` |
```

**Rule**: If pattern appears in 2+ places → must extract to shared module FIRST.

This prevents duplication that size limits alone won't catch.

### Step 3: Identify Decision Points

Analyze the CR to surface **implicit architectural decisions**.

For each decision point, determine:
- **Decision**: What structural choice must be made?
- **Options**: What are the 2-3 viable approaches?
- **Implication**: How does each option affect extensibility?

Common decision points:

| Decision Type | Signal in CR | Question to Surface |
|---------------|--------------|---------------------|
| **Code Location** | New functionality | Single file vs. multiple files? Which directory? |
| **Responsibility** | Multiple similar things | Logic per-item vs. centralized handler? |
| **Abstraction** | Shared behavior | Base class vs. interface vs. utility functions? |
| **Extension** | "Easily add new X" | Plugin pattern vs. configuration vs. subclass? |
| **Coupling** | Cross-module interaction | Who depends on whom? Shared interface? |

### Step 4: Present Decision Surface

Present decision points to user. Maximum 5 architectural questions.

**Question Format**:
```
Question: [Decision point as question]
Options:
- Option A (Recommended): [Concrete structure] → [Extension implication]
- Option B: [Concrete structure] → [Extension implication]
- Option C: [Concrete structure] → [Extension implication]
```

**Example**:
```
Question: Where should command-specific logic live?
Options:
- Per-command files (Recommended): `src/cli/commands/{name}` — each command isolated. To add: create one file.
- Centralized: All in index.ts — violates single responsibility. To add: edit shared file.
- Hybrid: Shared base + per-command overrides. To add: extend base class.
```

**Recommendation criteria**:
- Prefer structure where extension requires fewer file changes
- Prefer structure that isolates provider/handler/adapter-specific logic
- Prefer structure consistent with existing codebase patterns

### Step 5: Generate Architecture Design Section

Based on decisions, generate the `## Architecture Design` section:

```markdown
## Architecture Design

### Pattern
{Pattern name} — {one sentence why it fits the problem}

### Shared Patterns

| Pattern | Occurrences | Extract To | 
|---------|-------------|------------|
| {pattern} | {where appears} | `{path}` |

> These must be extracted BEFORE features that use them.

### Structure
```
{source_dir}/
  ├── {area}/
  │   ├── index.{ext}           → Orchestration only
  │   ├── {shared}/             → Shared utilities (extract first)
  │   │   └── {file}.{ext}
  │   └── {feature}/
  │       └── {file}.{ext}
```

### Size Guidance

**Defaults by role**:
| Role | Default | Hard Max (1.5x) |
|------|---------|-----------------|
| Orchestration (index, main) | 100 | 150 |
| Feature module | 200 | 300 |
| Complex logic (parser, state machine) | 300 | 450 |
| Utility / helper | 75 | 110 |

**Override**: CR Acceptance Criteria or project CLAUDE.md can specify different limits.

**Thresholds**:
- ≤ Default: ✅ OK
- Default to Hard Max: ⚠️ FLAG (task completes with warning)
- > Hard Max: ⛔ STOP (cannot proceed without justification)

**Applied to this CR**:
| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `{path}` | {role} | {N} | {N×1.5} |

### Extension Rule
To add {X}: create `{path}` ({role}, limit {N} lines) implementing `{interface}`.
```

**Constraints**:
- Pattern: Name a recognized pattern (Adapter, Factory, Strategy, etc.)
- Structure: Show concrete file paths, not abstract boxes
- Extension Rule: Must be testable and include size limit

### Step 6: Validate Design

Before inserting, validate:

1. **Shared patterns identified** — any logic in 2+ places has extraction target
2. **Size limits assigned** — every module in Structure has a limit
3. **Total check** — sum of limits < current monolith (no bloat)
4. **Consistency** — structure aligns with existing codebase conventions
5. **Artifact alignment** — file paths match CR Section 4 artifacts
6. **Extension rule testable** — includes "create X (limit N)"

If misalignment detected, update Section 4 or adjust design.

### Step 7: Insert and Update CR

Use `mdt-all:manage_cr_sections` to insert:

1. **Placement**: After `## 2. Decision`, before `## 3. Alternatives Considered`
   ```
   ## 1. Description
   ## 2. Decision
   ## Architecture Design    ← New section (no number)
   ## 3. Alternatives Considered
   ```

2. **Update Section 4 (Artifact Specifications)**:
   - Add files from Structure diagram to New Artifacts table

3. **Update Section 5 (Acceptance Criteria)**:
   - Add: `- [ ] No file exceeds Hard Max without justification`
   - Add: `- [ ] Shared patterns extracted before consumers`
   - Add: `- [ ] Extension Rule: {rule}`

### Step 8: Report Completion

```markdown
## Architecture Design Added

**CR**: {CR-KEY}
**Decisions Surfaced**: {N}
**Pattern Chosen**: {name}

### Shared Patterns
{list of patterns to extract first}

### Size Limits
| Module | Limit | Hard Max |
|--------|-------|----------|
| ... | ... | ... |

### Extension Rule
> {rule with size constraint}

### Sections Updated
- Architecture Design: Created
- Artifact Specifications: {Updated/Unchanged}
- Acceptance Criteria: Added size + extension verification

### Next Steps
- Review Architecture Design in CR
- Run `/mdt-tasks {CR-KEY}` — inherits these limits
- Phase 1 must extract shared patterns FIRST
```

## Architecture Design Examples

### Minimal (Simple Feature)

```markdown
## Architecture Design

### Pattern
Service extraction — isolate business logic from controller.

### Shared Patterns
None identified — single new module.

### Structure
```
src/
  ├── controllers/
  │   └── {resource}-controller.{ext}  → HTTP handling only
  └── services/
      └── {resource}-service.{ext}     → Business logic (new)
```

### Size Guidance
| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `{resource}-service` | Feature | 200 | 300 |

### Extension Rule
To add business logic: add methods to `{resource}-service` (limit 200 lines).
```

### Standard (Adapter Pattern)

```markdown
## Architecture Design

### Pattern
Adapter pattern — each adapter encapsulates its own logic.

### Shared Patterns
| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Base interface | All adapters | `adapters/base-adapter` |

### Structure
```
src/adapters/
  ├── base-adapter.{ext}    → Shared interface
  ├── {name}-adapter.{ext}  → Implementation A
  └── {name}-adapter.{ext}  → Implementation B
```

### Size Guidance
| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `base-adapter` | Shared base | 100 | 150 |
| `*-adapter` | Feature | 200 | 300 |

### Extension Rule
To add adapter: create `src/adapters/{name}-adapter` (limit 200 lines) implementing `BaseAdapter`.
```

### Complex (Multi-Pattern)

```markdown
## Architecture Design

### Pattern
Factory + Strategy — factory creates instances, each follows strategy interface.

### Shared Patterns
| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Interface | All implementations | `{domain}/{domain}.interface` |
| Config loading | All implementations | `{domain}/config-loader` |

### Structure
```
src/{domain}/
  ├── index.{ext}              → Factory (creates instances)
  ├── {domain}.interface.{ext} → Interface definition
  ├── config-loader.{ext}      → Shared config logic
  ├── {impl-a}/
  │   └── {impl-a}.{ext}       → Implements interface
  └── {impl-b}/
      └── {impl-b}.{ext}       → Implements interface
```

### Size Guidance
| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `index` | Orchestration | 100 | 150 |
| `{domain}.interface` | Shared base | 100 | 150 |
| `config-loader` | Utility | 75 | 110 |
| `{impl-*}` | Feature | 200 | 300 |

### Extension Rule
To add implementation: (1) create `src/{domain}/{name}/` with implementation (limit 200), (2) register in factory.
```

## Size Guidance Reference

**Defaults** (can be overridden by CR or project CLAUDE.md):

| Role | Default | Hard Max | Notes |
|------|---------|----------|-------|
| Orchestration | 100 | 150 | Wiring only, no business logic |
| Feature module | 200 | 300 | Core functionality |
| Complex logic | 300 | 450 | Parser, state machine, algorithm |
| Utility | 75 | 110 | Small, focused helpers |
| Shared base/interface | 100 | 150 | Contracts, minimal implementation |

**Override priority** (highest to lowest):
1. CR Acceptance Criteria
2. Project CLAUDE.md
3. These defaults

## Behavioral Rules

- **Maximum 5 architectural questions** — avoid analysis paralysis
- **Always provide recommendation** — mark one option as (Recommended)
- **Concrete file paths only** — no abstract "ModuleA" references
- **Shared patterns first** — identify before structure, extract before consumers
- **Size limits per module** — every file needs a limit
- **Extension rule includes size** — "create X (limit N lines)"
- **Don't over-architect** — if CR is simple, say "No architecture design needed"
- **Respect existing patterns** — structure should match codebase conventions

## Anti-Patterns to Avoid

❌ **Vague pattern**: "Use good design patterns"
✅ **Specific pattern**: "Adapter pattern — each provider owns its logic"

❌ **Abstract structure**: "Create modules for each concern"
✅ **Concrete structure**: "src/providers/ollama-provider.ts"

❌ **No size limit**: "To add provider, create one file"
✅ **With size limit**: "To add provider, create file (limit 200 lines)"

❌ **Ignoring shared patterns**: Design structure without checking duplication
✅ **Shared patterns first**: Identify what repeats, extract before consumers

## Quality Checklist

Before completing, verify:
- [ ] Shared patterns identified (logic in 2+ places)
- [ ] Pattern is named and justified
- [ ] Structure shows concrete file paths
- [ ] Size limits assigned to every module
- [ ] Extension Rule includes size constraint
- [ ] Extension Rule is testable
- [ ] Section 4 artifacts align with Structure
- [ ] Acceptance criteria includes size verification

## Integration

**Before**: CR exists with problem/scope defined
**After**: `/mdt-tasks` inherits shared patterns + size limits

Context: $ARGUMENTS
