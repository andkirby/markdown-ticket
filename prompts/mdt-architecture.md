# MDT Architecture Design Workflow (v1)

Interactive workflow for surfacing architectural decisions before implementation. Produces a lightweight `## Architecture Design` section that guides LLM code generation toward correct structure.

**Core Principle**: Surface the decisions LLM would otherwise make implicitly. Every architecture design must answer: "To add/extend X, what do I create and where?"

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Problem This Solves

Without explicit architecture design, LLMs make implicit structural decisions during code generation:
- Horizontal vs. vertical organization (e.g., 9 duplicated blocks across 3 layers)
- Single file vs. multiple files
- Inheritance vs. composition
- Centralized vs. distributed logic

These implicit decisions accumulate technical debt. This workflow surfaces them for human review **before** code generation.

## When to Use

Use this workflow when:
- CR involves multiple similar things (providers, handlers, adapters)
- CR introduces new abstraction or extension point
- CR affects code organization across files/modules
- User explicitly flags "needs architecture design"
- Previous implementation attempts produced poor structure

Do NOT use when:
- Simple bug fix with clear single-file scope
- Documentation-only change
- Configuration change without code structure impact
- CR already has explicit architecture in problem statement

## Execution Steps

### Step 1: Load CR Context

1. Use `mdt-all:get_cr` with `mode="full"` to retrieve CR content
   - Parse CR key, project code, current status
   - If CR doesn't exist, abort: "Create CR first using mdt-ticket-creation.md"
   - If CR status is "Implemented", warn: "Architecture design for implemented CR — creating post-hoc documentation"

2. Extract from CR:
   - Problem statement (what's being solved)
   - Affected artifacts (existing files/components)
   - New artifacts (planned files/components)
   - Scope boundaries (what changes, what doesn't)

3. Scan for architectural signals:
   - Multiple similar items (providers, handlers, validators, etc.)
   - Words: "adapter", "factory", "plugin", "provider", "handler", "strategy"
   - Patterns: "for each X", "multiple Y", "extensible", "configurable"
   - Integration points between layers/modules

### Step 2: Identify Decision Points

Analyze the CR to surface **implicit architectural decisions** that would otherwise be made during code generation.

For each potential decision point, determine:
- **Decision**: What structural choice must be made?
- **Options**: What are the 2-3 viable approaches?
- **Implication**: How does each option affect extensibility, coupling, or responsibility?

Common decision points to check:

| Decision Type | Signal in CR | Question to Surface |
|---------------|--------------|---------------------|
| **Code Location** | New functionality | Single file vs. multiple files? Which directory? |
| **Responsibility Distribution** | Multiple similar things | Logic per-item vs. centralized handler? |
| **Abstraction Level** | Shared behavior | Base class vs. interface vs. utility functions? |
| **Extension Mechanism** | "Easily add new X" | Plugin pattern vs. configuration vs. subclass? |
| **Coupling Direction** | Cross-module interaction | Who depends on whom? Shared interface? |
| **State Management** | Stateful operations | Where does state live? Who owns it? |

### Step 3: Present Decision Surface

Present decision points to user using `AskUserQuestion`. Maximum 5 architectural questions.

**Question Format**:

```
Question: [Decision point as question]
Header: Architecture Decision
Options:
- Option A: [Concrete structure] → [Extension implication]
- Option B: [Concrete structure] → [Extension implication]
- Option C: [Concrete structure] → [Extension implication] (if applicable)
```

**Example for adapter/provider pattern**:

```
Question: Where should adapter-specific logic live?
Header: Adapter Structure
Options:
- Per-adapter files (Recommended): src/adapters/{name}-adapter.ts — each adapter owns all its logic. To add adapter: create one file.
- Centralized handlers: src/handlers/{concern}.ts — each concern knows all adapters. To add adapter: edit N files.
- Hybrid approach: Shared base + per-adapter overrides. To add adapter: extend base class in one file.
```

**Recommendation criteria**:
- Prefer structure where extension requires fewer file changes
- Prefer structure that isolates provider/handler/adapter-specific logic
- Prefer structure consistent with existing codebase patterns
- Flag trade-offs explicitly (e.g., "more files but better isolation")

### Step 4: Generate Architecture Design Section

Based on user's decision answers, generate the `## Architecture Design` section with exactly three parts:

```markdown
## Architecture Design

### Pattern
[One pattern name + one sentence explaining why this pattern fits the problem]

### Structure
[ASCII diagram or nested list showing file/component organization]

### Extension Rule
[One sentence: "To add X, create Y in Z location"]
```

**Constraints**:
- Pattern: Name a recognized pattern (Adapter, Factory, Strategy, Repository, etc.) or describe as "Custom: [brief description]"
- Structure: Show concrete file paths, not abstract boxes. Use actual `src/` paths from the project.
- Extension Rule: Must be testable. After implementation, you can verify: "Can I add X by only creating/editing Y?"

### Step 5: Validate Against CR

Before inserting, validate the architecture design:

1. **Consistency check**: Does the structure align with existing codebase conventions?
2. **Completeness check**: Does it address all decision points identified in Step 2?
3. **Artifact alignment**: Do file paths in Structure match New/Modified Artifacts in Section 4?
4. **Extension rule testability**: Is the extension rule concrete enough to verify?

If misalignment detected:
- Update Section 4 (Artifact Specifications) to match architecture design
- Or adjust architecture design to match existing artifact specs
- Present discrepancy to user for resolution

### Step 6: Insert Architecture Design Section

Use `mdt-all:manage_cr_sections` to insert the section:

1. **Placement**: Insert `## Architecture Design` after `## 2. Decision` and before `## 3. Alternatives Considered`
   - This positions architecture as part of the decision, informing alternatives evaluation

2. **Section numbering**: Do NOT renumber existing sections. Architecture Design is unnumbered:
   ```
   ## 1. Description
   ## 2. Decision
   ## Architecture Design    ← New section (no number)
   ## 3. Alternatives Considered
   ## 4. Artifact Specifications
   ...
   ```

3. **Update operation**:
   - Use `operation: "get"` on section "2. Decision" to find insertion point
   - Use `operation: "append"` to add Architecture Design after Decision section
   - Verify insertion with `operation: "list"`

### Step 7: Update Related Sections

After inserting Architecture Design, ensure consistency:

1. **Section 4 (Artifact Specifications)**:
   - New Artifacts table should list files from Structure diagram
   - If architecture design introduced new files, add them
   - If architecture design removed planned files, update accordingly

2. **Section 3 (Alternatives Considered)**:
   - If architectural alternatives were discussed, add them to table
   - Mark chosen architecture approach with **ACCEPTED**

3. **Section 5 (Acceptance Criteria)**:
   - Add extension rule as acceptance criterion:
     `- [ ] To add [X], only [Y] file(s) need modification`

### Step 8: Report Completion

```markdown
## Architecture Design Added

**CR**: [PROJECT-XXX]
**Decisions Surfaced**: [N]
**Pattern Chosen**: [Pattern name]

### Structure Summary
[Brief description of file organization]

### Extension Rule
> [The extension rule from the design]

### Sections Updated
- Architecture Design: Created
- Artifact Specifications: [Updated/Unchanged]
- Alternatives Considered: [Updated/Unchanged]
- Acceptance Criteria: Added extension verification

### Validation
- [ ] Structure matches existing codebase conventions
- [ ] Extension rule is testable
- [ ] Artifact specs aligned with structure

### Next Steps
- Review Architecture Design section in CR
- If approved, proceed with implementation
- Implementation should follow Structure exactly
- After implementation, verify Extension Rule holds
```

## Architecture Design Format Reference

### Minimal Example (Simple Feature)

```markdown
## Architecture Design

### Pattern
Service extraction — isolate business logic from controller.

### Structure
```
src/
  ├── controllers/
  │   └── {Resource}Controller.ts  → HTTP handling only
  └── services/
      └── {Resource}Service.ts     → Business logic (new)
```

### Extension Rule
To add business logic for a resource, add methods to its `{Resource}Service.ts` only.
```

### Standard Example (Adapter Pattern)

```markdown
## Architecture Design

### Pattern
Adapter pattern — each adapter encapsulates its own configuration and request building.

### Structure
```
src/adapters/
  ├── base-adapter.ts      → Shared interface + common logic
  ├── {name}-adapter.ts    → Adapter-specific implementation
  └── {name}-adapter.ts    → Another adapter implementation
```

### Extension Rule
To add a new adapter, create one file in `src/adapters/` implementing `BaseAdapter` interface.
```

### Complex Example (Multi-Pattern)

```markdown
## Architecture Design

### Pattern
Factory + Strategy — factory creates instances, each implementation follows strategy interface.

### Structure
```
src/
  ├── {domain}/
  │   ├── index.ts              → Factory (creates instances)
  │   ├── {domain}.interface.ts → Interface definition
  │   ├── {impl-a}/
  │   │   ├── {impl-a}.ts       → Implements interface
  │   │   └── {impl-a}.config.ts→ Implementation-specific config
  │   └── {impl-b}/
  │       ├── {impl-b}.ts       → Implements interface
  │       └── {impl-b}.config.ts→ Implementation-specific config
  └── config/
      └── {domain}.yaml         → Registry
```

### Extension Rule
To add a new implementation: (1) create `src/{domain}/{name}/` folder with implementation + config, (2) register in `{domain}.yaml`.
```

## Behavioral Rules

- **Maximum 5 architectural questions** — avoid analysis paralysis
- **Always provide recommendation** — mark one option as (Recommended) with reasoning
- **Concrete file paths only** — no abstract "ModuleA" references
- **Extension rule is mandatory** — every design must answer "how do I add X?"
- **Don't over-architect** — if CR is simple, say "No architecture design needed" and exit
- **Respect existing patterns** — structure should match codebase conventions
- **No code in design** — structure shows files/organization, not implementation
- **Testable extension rules** — must be verifiable after implementation

## Anti-Patterns to Avoid

❌ **Vague pattern reference**: "Use good design patterns"
✅ **Specific pattern**: "Adapter pattern — each provider owns its logic"

❌ **Abstract structure**: "Create modules for each concern"
✅ **Concrete structure**: "src/providers/ollama-provider.ts"

❌ **Untestable extension rule**: "Adding providers should be easy"
✅ **Testable extension rule**: "To add provider, create one file in src/providers/"

❌ **Over-detailed design**: Including method signatures, types, full interfaces
✅ **Structural design**: File organization and responsibility boundaries only

❌ **Ignoring existing patterns**: Proposing new structure that conflicts with codebase
✅ **Consistent design**: Following existing directory conventions

## Integration with Other Workflows

**Before this workflow**:
- `mdt-ticket-creation.md` — CR must exist with basic problem/scope defined

**After this workflow**:
- `mdt-clarification.md` — Can run to fill remaining artifact gaps
- Implementation — LLM follows Architecture Design structure
- `mdt-reflection.md` — Captures if actual structure matched design

**Trigger phrase for users**: 
- "Add architecture design to [CR-KEY]"
- "This CR needs architecture design"
- "Run architecture workflow on [CR-KEY]"

## Quality Checklist

Before completing, verify:
- [ ] Pattern is named and justified in one sentence
- [ ] Structure shows concrete file paths (not abstract names)
- [ ] Extension Rule answers "To add X, create Y in Z"
- [ ] Extension Rule is testable after implementation
- [ ] Structure matches existing codebase conventions
- [ ] Section 4 artifacts align with Structure
- [ ] No code snippets in Architecture Design section
- [ ] Acceptance criteria includes extension verification

Context for prioritization: $ARGUMENTS
