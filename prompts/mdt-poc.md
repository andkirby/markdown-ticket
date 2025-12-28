# MDT Proof of Concept Workflow (v1)

Validate uncertain technical decisions through hands-on experimentation before committing to architecture.

**Core Principle**: When documentation and research can't answer "will this work?", build a throwaway spike to find out.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Problem This Solves

Some technical decisions can't be validated through documentation alone:
- "Does library X support feature Y in our context?"
- "Can we achieve acceptable performance with approach Z?"
- "How does service A behave when B happens?"
- "What's the actual API shape returned by C?"

Without hands-on validation, architecture commits to unproven approaches, leading to:
- Mid-implementation pivots (waste)
- Workarounds for discovered limitations (debt)
- Incorrect assumptions baked into tests (fragile)

PoC resolves uncertainty **before** architecture locks in decisions.

## When to Use

### Explicit Trigger (User Request)

User says:
- "I need to verify X works"
- "Not sure if library supports Y"
- "Build a proof of concept for Z"
- "Let's spike on this before architecture"

### Detected Trigger (From `/mdt:architecture`)

Architecture workflow detects uncertainty and suggests PoC:

```markdown
⚠️ **Technical Uncertainty Detected**

| Question | Why It Matters | Suggestion |
|----------|----------------|------------|
| {uncertainty} | {impact on design} | `/mdt:poc {CR-KEY} --question "{question}"` |

Recommend: Run PoC before finalizing architecture.
```

### Open Questions in CR

CR contains unresolved technical questions:

```markdown
## Open Questions
- [ ] Does Express support dynamic port binding with graceful shutdown?
- [ ] Can pdf-lib handle encrypted PDFs without external dependencies?
```

## Do NOT Use When

- Question can be answered by reading documentation
- Decision is about code organization (that's architecture)
- Feature is well-understood, just needs implementation
- Time pressure doesn't allow thorough investigation

## Output

### File: `{TICKETS_PATH}/{CR-KEY}/poc.md`

Documents findings for architecture to consume.

### Folder: `{TICKETS_PATH}/{CR-KEY}/poc/`

Contains throwaway spike code. **Not committed** — add to `.gitignore`:

```gitignore
# Proof of concept spikes (throwaway)
**/poc/
```

## Execution Steps

### Step 1: Load Context

1. `mdt-all:get_cr` with `mode="full"` — get CR context
2. Parse `$ARGUMENTS`:
   - `{CR-KEY}` — required
   - `--question "{question}"` — optional, specific question to answer
   - `--questions` — list open questions from CR
3. Extract from CR:
   - Problem statement
   - Open Questions section (if exists)
   - Affected technologies/libraries
   - Any constraints mentioned

### Step 2: Identify Questions to Answer

**If `--question` provided**: Use that question directly.

**If `--questions` flag**: List questions from CR for selection:

```markdown
## Open Questions from {CR-KEY}

| # | Question | Type |
|---|----------|------|
| 1 | {question from CR} | {Feasibility/Integration/Performance/Behavior} |
| 2 | {question from CR} | {type} |

Which question(s) to investigate? [1] [2] [all]
```

**If no flag and CR has Open Questions**: Prompt for selection.

**If no flag and no Open Questions**: Ask user to specify:

```markdown
No open questions found in CR.

What technical question needs validation?

Examples:
- "Does {library} support {feature}?"
- "Can we achieve {goal} with {approach}?"
- "What happens when {scenario}?"
```

### Step 3: Frame the Hypothesis

For each question, create a testable hypothesis:

```markdown
## Hypothesis

**Question**: {the question being answered}

**Hypothesis**: {what we expect to be true}

**Success Criteria**:
- [ ] {observable outcome 1}
- [ ] {observable outcome 2}

**Failure Indicators**:
- {what would prove hypothesis wrong}
```

### Step 4: Design the Experiment

Plan minimal code to validate the hypothesis:

```markdown
## Experiment Design

**Approach**: {what we'll build}

**Scope Boundaries**:
- IN: {what's included}
- OUT: {what's explicitly excluded — no production concerns}

**Files to Create**:
| File | Purpose |
|------|---------|
| `poc/{experiment-name}/index.{ext}` | {main experiment code} |
| `poc/{experiment-name}/README.md` | {how to run} |

**Dependencies** (temporary, spike-only):
- {package}: {why needed for experiment}

**Expected Duration**: {rough estimate}
```

**Scope Boundary Rules**:
- No error handling beyond what's needed to see results
- No tests (this IS the test)
- No production code structure
- No configuration abstraction
- Hardcoded values are fine
- Console output is fine for verification

### Step 5: Build the Spike

Execute the experiment:

1. Create `{TICKETS_PATH}/{CR-KEY}/poc/{experiment-name}/` directory
2. Initialize minimal project (if needed):
   ```bash
   cd {TICKETS_PATH}/{CR-KEY}/poc/{experiment-name}
   npm init -y  # or equivalent for language
   ```
3. Install spike dependencies
4. Write experimental code
5. Create README with run instructions

**Code Quality Bar**: "Works enough to answer the question"

- Readable: Someone can understand what's being tested
- Runnable: Clear instructions to execute
- Observable: Output shows whether hypothesis holds

**NOT Required**:
- Clean architecture
- Error handling
- Tests
- Documentation beyond README
- Reusable code

### Step 6: Run and Observe

Execute the spike and document observations:

```markdown
## Execution Log

**Command**: `{how to run}`

**Output**:
```
{actual output from running}
```

**Observations**:
- {what we saw}
- {unexpected behavior}
- {performance characteristics if relevant}
```

### Step 7: Document Findings

Create `{TICKETS_PATH}/{CR-KEY}/poc.md`:

```markdown
# Proof of Concept: {Title}

**CR**: {CR-KEY}
**Date**: {date}
**Duration**: {how long this took}

---

## Question

{The question we set out to answer}

## Hypothesis

{What we expected}

## Experiment

**Approach**: {what we built}

**Code Location**: `poc/{experiment-name}/`

**Key Code** (relevant snippet only):
```{language}
{the critical part that answers the question — not full code}
```

## Findings

### What Worked
- {finding 1}
- {finding 2}

### What Didn't Work
- {limitation 1}
- {limitation 2}

### Unexpected Discoveries
- {surprise finding}

### Constraints Discovered
- {constraint that architecture must respect}

### Performance Characteristics
{if relevant}
- {metric}: {value}

## Decision

**Answer**: {Yes/No/Partial — direct answer to question}

**Recommended Approach**: {what architecture should use}

**Rationale**: {why this approach based on findings}

**Alternatives Eliminated**: {approaches we can now rule out}

## Impact on Architecture

| Aspect | Implication |
|--------|-------------|
| {component/pattern} | {how findings affect design} |

## Cleanup

- [ ] PoC code is throwaway — do not adapt
- [ ] OR: Specific patterns worth adapting: {list}

---

## Next Steps

Architecture can now proceed with validated approach:

`/mdt:architecture {CR-KEY}`
```

### Step 8: Handle Multiple Questions

If investigating multiple questions:

1. Run Steps 3-7 for each question
2. Create separate experiment folders: `poc/{question-1}/`, `poc/{question-2}/`
3. Consolidate findings in single `poc.md` with sections per question
4. Summarize cross-cutting implications

---

## Integration with Other Workflows

### From `/mdt:requirements`

Open Questions that are technical in nature → suggest PoC:

```markdown
## Open Questions

- [ ] {business question} → defer to stakeholder
- [ ] {technical question} → `/mdt:poc` candidate ⚗️
```

### From `/mdt:assess`

If assessment reveals uncertainty about integration approach:

```markdown
⚠️ Integration uncertainty: {file} uses {pattern} — unclear if compatible.

Consider: `/mdt:poc {CR-KEY} --question "Can we integrate with {pattern}?"`
```

### To `/mdt:architecture`

Architecture consumes `poc.md`:

1. Check for `{TICKETS_PATH}/{CR-KEY}/poc.md`
2. If found: Extract decisions and constraints
3. Reference in architecture: "Per PoC findings, using {approach}"
4. Constraints from PoC become architecture constraints

```markdown
## Key Dependencies

| Dependency | Rationale |
|------------|-----------|
| {library} | Validated in PoC: supports {feature} |
```

### To `/mdt:tests`

PoC findings may inform test scenarios:

- Edge cases discovered during spike
- Performance thresholds validated
- Error conditions observed

---

## Example Session

**User**: `/mdt:poc MDT-088 --question "Does Vitest support dynamic test generation from YAML files?"`

**Output**:

```markdown
## Hypothesis

**Question**: Does Vitest support dynamic test generation from YAML files?

**Hypothesis**: We can read YAML at test-time and generate test cases dynamically.

**Success Criteria**:
- [ ] YAML file parsed before tests run
- [ ] Each YAML entry becomes a separate test case
- [ ] Test names reflect YAML content

---

## Experiment Design

**Approach**: Create minimal Vitest setup with YAML-driven tests

**Files to Create**:
| File | Purpose |
|------|---------|
| `poc/vitest-yaml/vitest.config.ts` | Vitest configuration |
| `poc/vitest-yaml/tests/dynamic.test.ts` | Dynamic test generation |
| `poc/vitest-yaml/fixtures/cases.yaml` | Test case definitions |
| `poc/vitest-yaml/README.md` | Run instructions |

**Dependencies**:
- vitest: test runner
- yaml: YAML parsing

---

[... spike code created ...]

---

## Findings

### What Worked
- `test.each()` accepts dynamically generated arrays
- YAML parsed synchronously at module load time
- Test names interpolate from YAML data

### Constraints Discovered
- YAML must be loaded synchronously (no async in describe block)
- File path relative to test file, not project root

## Decision

**Answer**: Yes — Vitest supports this pattern

**Recommended Approach**: 
- Load YAML with `yaml.parse(fs.readFileSync(...))`
- Use `test.each()` with spread operator
- Place YAML fixtures adjacent to test files

## Cleanup

- [x] PoC code is throwaway — do not adapt
- [ ] Pattern worth adapting: the `test.each` structure

---

Next: `/mdt:architecture MDT-088`
```

---

## Quick Mode

For simpler questions that don't need full documentation:

```
/mdt:poc {CR-KEY} --quick --question "{question}"
```

**Outputs**:
- Spike code in `poc/` folder
- Brief finding appended to CR's Open Questions section (question marked answered)
- No separate `poc.md` file

```markdown
## Open Questions

- [x] Does Express support dynamic ports? → **Yes**: `server.listen(0)` assigns random available port, retrieve with `server.address().port`
```

---

## Behavioral Rules

1. **Throwaway mindset** — PoC code is disposable; never polish it
2. **Answer the question** — don't expand scope beyond what's needed
3. **Observable results** — always show actual output, not just "it works"
4. **Document constraints** — limitations discovered are valuable
5. **Time-box loosely** — thorough investigation is fine, but stay focused on the question
6. **No production concerns** — skip error handling, tests, clean code
7. **Findings feed architecture** — the point is to inform design decisions
8. **Multiple spikes OK** — complex questions may need several experiments

## Position in Workflow

```
/mdt:requirements
        ↓
/mdt:assess (optional)
        ↓
┌─────────────────────────────────────────┐
│ /mdt:poc (when technical uncertainty)   │ ← YOU ARE HERE
│                                         │
│ Triggers:                               │
│ - User requests spike                   │
│ - Open Questions with tech focus        │
│ - /mdt:architecture detects uncertainty │
│                                         │
│ Output:                                 │
│ - poc.md (findings for architecture)    │
│ - poc/ folder (throwaway spike code)    │
└─────────────────────────────────────────┘
        ↓
/mdt:tests (informed by PoC findings)
        ↓
/mdt:architecture (consumes poc.md)
        ↓
/mdt:tasks → /mdt:implement
```

Context: $ARGUMENTS
