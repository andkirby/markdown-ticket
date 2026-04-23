# MDT Code Fitness Assessment Workflow (v2)

Assess affected code before architecture design. Surfaces the decision: integrate as-is, refactor inline, or split CRs.

**Core Principle**: Know the state of what you're touching before deciding how to touch it.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output

File `{filename}` has {None/Partial} test coverage.
Refactoring without tests risks breaking undocumented behavior.

**Behaviors identified for testing**:
| Behavior | Type | Risk if Untested |
|----------|------|------------------|
| `{function}` returns `{shape}` | Return contract | Silent shape change |
| `{function}` throws `{ErrorType}` | Error contract | Wrong error type |
| `{function}` emits `{event}` | Side effect | Missing events |

**Recommendation**: Add behavioral preservation tests before proceeding.

Options:
[A] Add tests inline (expand CR scope)
[B] Create test CR first (CR-TEST blocks this CR)
[C] Proceed without tests (accept risk)

```

### Step 5: Determine Recommendation

Based on findings:

**Option 1 (Just Integrate)** when:
- All files ✅ Healthy
- Or: ⚠️ files not in direct change path
- Or: Deadline pressure justifies deferring

**Option 2 (Refactor Inline)** when:
- ⚠️ files in direct change path
- Total refactor effort ≤ 4 hours
- Refactoring improves the feature work

**Option 3 (Split CRs)** when:
- 🔴 Critical files in change path
- Total refactor effort > 4 hours
- Refactoring benefits multiple future CRs
- High-risk files (volatile + low tests)
- **🔴 No test coverage on files being refactored** (test CR first)

### Step 6: Present Assessment

```markdown
## Code Fitness Assessment: {CR-KEY}

### Summary

| Verdict | Count | Action |
|---------|-------|--------|
| ✅ Healthy | {N} | Proceed |
| ⚠️ Concerning | {N} | Consider refactoring |
| 🔴 Critical | {N} | Refactor required |

### Affected Files

| File | Lines | Limit | Coupling | Tests | Churn | Score | Verdict |
|------|-------|-------|----------|-------|-------|-------|---------|
| `{path}` | {N} | {N} | {L/M/H} | ✅/⚠️/🔴 | {S/A/V} | {N}% | {verdict} |

### Test Coverage Detail

| File | Coverage | Test File | Behaviors Locked | Behaviors at Risk |
|------|----------|-----------|------------------|-------------------|
| `{path}` | {✅/⚠️/🔴} | `{test_path}` | {N} | {N} |

**Behaviors at Risk** (need tests before refactoring):

{For each file with ⚠️ or 🔴 test coverage}

#### `{filename}` — {N} unlocked behaviors

| Behavior | Source | Why It Matters |
|----------|--------|----------------|
| `{function}()` returns `{Type}` | Line {N} | API contract |
| `{function}()` throws on `{condition}` | Line {N} | Error handling |
| `{sideEffect}` occurs when `{condition}` | Line {N} | Observable effect |

### Findings

{For each ⚠️ or 🔴 file}

#### `{filename}` ({verdict})

**Issues**:
- {issue 1}: {details}
- {issue 2}: {details}

**Change Surface**: {N} locations need modification for this CR

**Refactor Effort**: ~{N} hours
- {what refactoring would involve}

**Risk if not refactored**: {what could go wrong}

---

### Recommendation: Option {N} — {name}

{Reasoning for recommendation}

---

## Choose Your Path

### Option 1: Just Integrate ⚡
Proceed with feature. Work around existing structure.

**Pros**:
- Fastest to deliver
- No scope change

**Cons**:
- Adds to existing debt
- May make feature harder to implement
- {specific risks for this CR}

**Choose when**: Deadline pressure, isolated change, debt acceptable

---

### Option 2: Refactor Inline 🔧
Add refactoring to this CR scope.

**Scope Addition**:
{list of refactoring tasks to add}

**Total Added Effort**: ~{N} hours

{If refactoring fundamentally changes code structure (e.g., breaking up God class, introducing new services):}

**⚠️ Prep Required**: Refactoring changes the code landscape.
- Feature architecture depends on refactored structure
- Design refactoring first, then design feature against NEW code
- Use `prep/` workflow: `/mdt:architecture {CR-KEY} --prep`

{End if}

**Pros**:
- Improves feature work
- Reduces debt
- Single review cycle

**Cons**:
- Scope creep
- Larger PR
- {specific risks}

**Choose when**: Refactoring is small, directly improves feature work

**Choose prep workflow when**: Refactoring creates new components that feature will interact with differently

---

### Option 3: Split CRs 📋
Create prerequisite CR(s) first, feature CR depends on them.

**Scenario A: Test Coverage Critical**

**New CR**: "Add behavioral tests for {files}" (Test CR)
**Then**: {CR-KEY} blocked by {TEST-CR-KEY}

**Test CR Scope**:
- Add preservation tests for `{file1}` — lock {N} behaviors
- Add preservation tests for `{file2}` — lock {N} behaviors

**Scenario B: Refactoring Needed (with test coverage OK)**

**New CR**: {suggested refactoring title}
**Dependency**: {CR-KEY} blocked by {REFACTOR-CR-KEY}

**Refactoring CR Scope**:
{list of refactoring work}

**Scenario C: Both Needed**

```

{TEST-CR-KEY} (add tests)
        ↓
{REFACTOR-CR-KEY} (refactor with tests as safety net)
        ↓
{CR-KEY} (original feature)

```

**Pros**:
- Clean separation
- Refactoring can be reviewed independently
- Unblocks other work on same files

**Cons**:
- Delays feature
- Two review cycles
- Coordination overhead

**Choose when**: Refactoring is substantial, benefits multiple features

---

## Your Choice: [1] [2] [3]
```

### Step 7: Execute Choice

**If Option 1 chosen**:

```markdown
✓ Proceeding with original scope.

Next: `/mdt:architecture {CR-KEY}`
```

**If Option 2 chosen (simple refactoring)**:
1. Update CR scope via `mdt-all:manage_cr_sections`:
   - Add refactoring items to Section 1 (Scope)
   - Add refactoring artifacts to Section 4
   - Add refactoring acceptance criteria to Section 5

```markdown
✓ CR scope updated with refactoring tasks.

Added to scope:
- {refactoring item 1}
- {refactoring item 2}

Next: `/mdt:architecture {CR-KEY}`
```

**If Option 2 chosen (prep required — refactoring changes code landscape)**:
1. Update CR scope via `mdt-all:manage_cr_sections`:
   - Add refactoring items to Section 1 (Scope)
   - Note "Prep workflow required" in Scope

```markdown
✓ CR scope updated. Prep workflow activated.

Workflow:
1. `/mdt:bdd {CR-KEY} --prep` — lock E2E user journeys (GREEN)
2. `/mdt:architecture {CR-KEY} --prep` — design refactoring
3. `/mdt:tests {CR-KEY} --prep` — lock module behavior (GREEN)
4. `/mdt:tasks {CR-KEY} --prep` — refactoring tasks
5. `/mdt:implement {CR-KEY} --prep` — execute refactoring (tests stay GREEN)
   *** Codebase now restructured ***
6. `/mdt:architecture {CR-KEY}` — design feature against NEW code
7. Continue normal workflow...

Next: `/mdt:bdd {CR-KEY} --prep`
```

**If Option 3 chosen**:

**3a. If Test CR needed**:
1. Create test CR via `mdt-all:create_cr` type="Technical Debt"
2. Update original CR with `dependsOn`

```markdown
✓ Created test CR: {TEST-CR-KEY}
✓ Updated {CR-KEY} with dependency

Workflow:
1. `/mdt:bdd {TEST-CR-KEY} --prep` — lock E2E user journeys (GREEN)
2. `/mdt:architecture {TEST-CR-KEY} --prep` — design test structure
3. `/mdt:tests {TEST-CR-KEY} --prep` — lock module behavior (GREEN)
4. `/mdt:tasks {TEST-CR-KEY} --prep` — plan test tasks
5. `/mdt:implement {TEST-CR-KEY} --prep` — write tests (should pass against current code)
6. Then return to {CR-KEY} (now safe to refactor)

Next: `/mdt:bdd {TEST-CR-KEY} --prep`
```

**3b. If Refactor CR needed (tests OK)**:
1. Create refactoring CR via `mdt-all:create_cr`
2. Update original CR with `dependsOn`

```markdown
✓ Created refactoring CR: {NEW-CR-KEY}
✓ Updated {CR-KEY} with dependency

Workflow:
1. `/mdt:bdd {NEW-CR-KEY} --prep` — lock E2E behavior (GREEN)
2. `/mdt:architecture {NEW-CR-KEY} --prep` — design refactoring
3. `/mdt:tests {NEW-CR-KEY} --prep` — lock module behavior (GREEN)
4. `/mdt:tasks {NEW-CR-KEY} --prep` — plan refactoring
5. `/mdt:implement {NEW-CR-KEY} --prep` — execute refactoring (tests stay GREEN)
6. Then return to {CR-KEY}

Next: `/mdt:bdd {NEW-CR-KEY} --prep`
```

**3c. If Both needed**:
1. Create test CR first
2. Create refactor CR depending on test CR
3. Update original CR depending on refactor CR

```markdown
✓ Created test CR: {TEST-CR-KEY}
✓ Created refactor CR: {REFACTOR-CR-KEY} (depends on {TEST-CR-KEY})
✓ Updated {CR-KEY} (depends on {REFACTOR-CR-KEY})

Workflow:
1. `/mdt:bdd {TEST-CR-KEY} --prep` → architecture → tests --prep → tasks → implement → tests GREEN
2. `/mdt:bdd {REFACTOR-CR-KEY} --prep` → architecture → tests --prep → tasks → implement (tests stay GREEN)
3. Return to {CR-KEY}

Next: `/mdt:bdd {TEST-CR-KEY} --prep`
```

---

## Quick Assessment Mode

For faster assessment when you know what you're looking for:

```
/mdt:assess {CR-KEY} --quick
```

Outputs condensed version:

```markdown
## Quick Assessment: {CR-KEY}

| File | Scope/Cohesion | Fitness | Verdict |
|------|-----------------|---------|---------|
| `{path}` | {signal} | {N}% | {emoji} |

**Recommendation**: Option {N}
**Reason**: {one sentence}

[1] Integrate  [2] Refactor inline  [3] Split CRs
```

---

## Behavioral Rules

1. **Analyze before judging** — gather data, then recommend
2. **Effort estimates are rough** — use for comparison, not planning
3. **Respect user choice** — present options, don't force
4. **Update CR if scope changes** — Option 2/3 must update CR
5. **Don't over-assess** — if all files healthy, say so quickly
6. **Consider change path** — file might be concerning but not in direct path
7. **Churn + low tests = danger** — flag this combination explicitly
8. **Test coverage gates refactoring** — 🔴 None coverage on refactor target = must add tests first
9. **Behavioral preservation > new tests** — for refactoring, lock existing behavior before changing structure

## Integration

**Before**: CR exists with Affected Artifacts defined
**After**:
- Option 1 → `/mdt:bdd {CR-KEY}` (then architecture)
- Option 2 → `/mdt:bdd {CR-KEY} --prep` (prep workflow, then feature)
- Option 3 → `/mdt:bdd {NEW-CR-KEY} --prep` (refactoring CR first)

**Position in workflow**:

```
/mdt:ticket-creation → /mdt:requirements → /mdt:bdd → /mdt:assess → /mdt:architecture → ...
                                                          ↓
                                               Decision point: 1/2/3
                                                          ↓
                          Option 2 with prep? → /mdt:bdd --prep
                                               → /mdt:architecture --prep
                                               → /mdt:tests --prep
                                               → /mdt:tasks --prep
                                               → /mdt:implement --prep
                                               → /mdt:architecture (feature)
                                               → /mdt:tests (feature)
                                               → normal workflow...
```

Context: $ARGUMENTS
