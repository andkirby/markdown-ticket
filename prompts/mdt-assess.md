# MDT Code Fitness Assessment Workflow (v2)

Assess affected code before architecture design. Surfaces the decision: integrate as-is, refactor inline, or split CRs.

**Core Principle**: Know the state of what you're touching before deciding how to touch it.

## User Input

```text
$ARGUMENTS
```

## Output

Interactive decision with three options — no file generated. Updates CR scope if Option 2/3 chosen.

## When to Use

Use this workflow when:
- CR affects existing files (not greenfield)
- Unsure if affected code needs refactoring first
- Previous work on this area revealed problems
- CR touches files you haven't examined recently

Do NOT use when:
- Greenfield feature (no existing code)
- You already know the code state
- Simple documentation change
- Already ran assessment recently on same files

## Execution Steps

### Step 1: Load CR Context

1. `mdt-all:get_cr` with `mode="full"` — abort if CR doesn't exist
2. Extract from CR:
   - **Affected Artifacts** (Section 1) — files to analyze
   - **Modified Artifacts** (Section 4) — specific changes planned
   - **Scope** — what changes, what doesn't
3. Load project context from CLAUDE.md or config files:
   - Source directory
   - Test command
   - File extension
   - Size limits (if defined)

### Step 2: Analyze Each Affected File

For each file in Affected/Modified Artifacts:

**2a. Size Analysis**
```bash
wc -l {file}
```
Compare against role-based limits:
| Role | Default | Hard Max |
|------|---------|----------|
| Orchestration | 100 | 150 |
| Feature | 200 | 300 |
| Complex | 300 | 450 |
| Utility | 75 | 110 |

**2b. Change Surface**
Estimate how many locations in the file need modification for this CR:
- 1-2 locations → Low
- 3-5 locations → Medium  
- 6+ locations → High (shotgun surgery signal)

**2c. Coupling Analysis**
```bash
# Inbound: who imports this file
grep -r "from.*{filename}" {source_dir} --include="*{ext}" | wc -l

# Outbound: what this file imports
grep -E "^import|^from" {file} | wc -l
```
- ≤3 dependencies → Low coupling
- 4-7 dependencies → Medium coupling
- 8+ dependencies → High coupling

**2d. Test Coverage** (Critical for Refactoring)
```bash
# Check if test file exists
ls {test_dir}/*{filename}* 2>/dev/null

# If exists, count test cases
grep -c "it(\|test(\|def test_" {test_file}

# Check test recency vs source recency
stat -f "%m" {test_file}  # test last modified
stat -f "%m" {source_file}  # source last modified
```

| Coverage Level | Criteria | Refactor Risk |
|----------------|----------|---------------|
| ✅ Good | Tests exist, cover public interface, recent | Low — behavior locked |
| ⚠️ Partial | Tests exist but stale or incomplete | Medium — some behavior unlocked |
| 🔴 None | No test file or empty tests | High — behavior undocumented |

**Behavioral Analysis** (when coverage is Partial or None):

Identify behaviors that MUST be tested before refactoring:
- Public function signatures and return shapes
- Error conditions and error types thrown
- Side effects (events emitted, files written, APIs called)
- Edge cases visible in code (null checks, empty arrays, etc.)

**2e. Recent Churn** (if git available)
```bash
git log --oneline --since="3 months ago" -- {file} | wc -l
```
- ≤2 changes → Stable
- 3-5 changes → Active
- 6+ changes → Volatile (risky to change)

### Step 3: Calculate Fitness Scores

For each file, calculate fitness:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Size vs. Limit | 25% | Over limit = 0, At limit = 50, Under = 100 |
| Change Surface | 20% | Low = 100, Medium = 60, High = 20 |
| Coupling | 15% | Low = 100, Medium = 60, High = 30 |
| **Test Coverage** | **25%** | Good = 100, Partial = 50, None = 10 |
| Churn | 15% | Stable = 100, Active = 60, Volatile = 30 |

> ⚠️ **Test Coverage is weighted heavily** because refactoring without tests is flying blind. A file with good size but no tests is riskier than an oversized file with solid tests.

**Verdicts**:
- Score ≥ 70 → ✅ Healthy
- Score 40-69 → ⚠️ Concerning
- Score < 40 → 🔴 Critical

### Step 4: Estimate Refactor Effort

For files with ⚠️ or 🔴 verdict:

| Issue | Typical Effort | Signal |
|-------|----------------|--------|
| Oversized (1.0-1.5x limit) | 1-2 hours | Extract one concern |
| Oversized (>1.5x limit) | 2-4 hours | Split into modules |
| High coupling | 2-3 hours | Introduce interface |
| **No tests (🔴 Critical)** | **2-4 hours** | **Must add behavioral tests BEFORE refactoring** |
| **Partial tests** | 1-2 hours | Add missing behavioral coverage |
| High churn + low tests | 4+ hours | Stabilize before changing |

### Test Coverage Gate

When test coverage is 🔴 None or ⚠️ Partial on files in the change path:

```markdown
⚠️ TEST COVERAGE GATE

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

**Pros**:
- Improves feature work
- Reduces debt
- Single review cycle

**Cons**:
- Scope creep
- Larger PR
- {specific risks}

**Choose when**: Refactoring is small, directly improves feature work

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

**If Option 2 chosen**:
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

**If Option 3 chosen**:

**3a. If Test CR needed**:
1. Create test CR via `mdt-all:create_cr` type="Technical Debt"
2. Update original CR with `dependsOn`

```markdown
✓ Created test CR: {TEST-CR-KEY}
✓ Updated {CR-KEY} with dependency

Workflow:
1. `/mdt:tests {TEST-CR-KEY}` — generate behavioral preservation tests
2. `/mdt:tasks {TEST-CR-KEY}` — plan test implementation
3. `/mdt:implement {TEST-CR-KEY}` — write tests (should pass against current code)
4. Then return to {CR-KEY} (now safe to refactor)

Next: `/mdt:tests {TEST-CR-KEY}`
```

**3b. If Refactor CR needed (tests OK)**:
1. Create refactoring CR via `mdt-all:create_cr`
2. Update original CR with `dependsOn`

```markdown
✓ Created refactoring CR: {NEW-CR-KEY}
✓ Updated {CR-KEY} with dependency

Workflow:
1. `/mdt:architecture {NEW-CR-KEY}` — design refactoring
2. `/mdt:tasks {NEW-CR-KEY}` — plan refactoring
3. `/mdt:implement {NEW-CR-KEY}` — execute refactoring
4. Then return to {CR-KEY}

Next: `/mdt:architecture {NEW-CR-KEY}`
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
1. `/mdt:tests {TEST-CR-KEY}` → implement → tests pass
2. `/mdt:architecture {REFACTOR-CR-KEY}` → tasks → implement (tests stay green)
3. Return to {CR-KEY}

Next: `/mdt:tests {TEST-CR-KEY}`
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

| File | Size | Fitness | Verdict |
|------|------|---------|---------|
| `{path}` | {N}/{limit} | {N}% | {emoji} |

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
- Option 1 → `/mdt:architecture {CR-KEY}`
- Option 2 → `/mdt:architecture {CR-KEY}` (with expanded scope)
- Option 3 → `/mdt:architecture {NEW-CR-KEY}` (refactoring CR first)

**Position in workflow**:
```
/mdt:ticket-creation → /mdt:requirements → /mdt:assess → /mdt:architecture → ...
                                               ↓
                                    Decision point: 1/2/3
```

Context: $ARGUMENTS
