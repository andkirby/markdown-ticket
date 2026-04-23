# MDT Test Specification Workflow (v8)

Generate unit/integration tests from architecture design. Tests written AFTER architecture, BEFORE implementation.

## Skill Discovery

Check `AGENTS.md` for skills matching this workflow. If found, invoke via Skill tool before proceeding.

## Decision Tree

```
Input: /mdt:tests {CR-KEY} [--prep] [--part X.Y]

Is architecture.md present?
├─ No → ERROR: Run /mdt:architecture first
│
└─ Yes → What mode?
    ├─ --prep flag → Prep mode (GREEN tests, lock behavior)
    │   └─ Read: prep/architecture.md
    │   └─ Output: prep/tests.md
    │
    └─ Feature mode → RED tests (fail until implemented)
        ├─ Multi-part (part-*/ folders exist)?
        │   ├─ --part specified → Use that part
        │   └─ Multiple parts → Prompt for selection
        │
        └─ Output: [part-X.Y/]tests.md + test files
```

## Extraction: What to Test

From architecture.md, extract **three categories**:

### 1. Module Interfaces (methods/functions)

| Architecture Element | Test Type |
|---------------------|-----------|
| Component/Module | Unit: public interface |
| Service | Integration: dependencies |
| Adapter | Integration: external systems |

### 2. Data Mechanisms (CRITICAL - often missed)

Scan architecture for **concrete data rules** that need explicit tests:

| Pattern | Example | Required Tests |
|---------|---------|----------------|
| Boundary | "max 100 items", "limit N" | At N-1, N, N+1 |
| Format | "UUID", "email", "ISO date" | Valid accepted, invalid rejected |
| Config | env vars, config files | Present, missing, malformed |
| State | "when empty", "when full" | Each state transition |

### 3. External Dependency Tests

For each external dependency declared in architecture (env var, CLI tool, API, service), require at least one **real** integration test (not mocked). If a real dependency is unavailable in CI, use a local stub or contract test and explicitly note the limitation.

| Dependency Type | Required Test |
|-----------------|--------------|
| Env var | Behavior when var is set vs absent (real env) |
| External command | At least one test with a real command (e.g., `echo test`) |
| API/Service | At least one test against real or local endpoint (or contract test if gated) |

### 4. Architecture Structure Coverage

Walk the architecture.md Structure section (file tree) and classify entries:
- **Runtime source files** (feature logic, runtime modules, handlers/adapters/routes/components): must have corresponding tests.
- **Bootstrap/config artifacts** (manifest, toolchain config, entry wiring): do not require direct unit tests, but must be covered by an execution/runner viability check.

If a runtime source file has no test, add one. This prevents entire runtime layers from being silently skipped.

## Constraint Coverage

If requirements.md includes constraint IDs (C1, C2...), add a constraint coverage section. Constraints are tested here, not in BDD, unless they are user-visible.

| Constraint ID | Test(s) |
|---------------|---------|
| C1 | {test name} |
| C2 | {test name} |

## Test Template (Minimal)

```
# Structure (adapt to project's test framework)

ModuleName tests:
  publicMethod:
    - returns expected for valid input
    - throws/errors for invalid input

  # Data mechanism tests (from architecture)
  boundary handling:
    - at limit (N)
    - below limit (N-1)
    - above limit (N+1)
```

## Output (Two Things)

### 1. Write Test Files (TDD)

Write actual executable test files to project's test directory. Follow project's existing conventions.

**Test file naming by ecosystem**:
| Ecosystem | Patterns |
|-----------|----------|
| TypeScript/Node.js | `*.test.ts`, `*.spec.ts` |
| Python | `test_*.py`, `*_test.py` |

**Language reference** (load for test structure and assertions):
- TypeScript/Node.js: `mdt/references/typescript.md`
- Python: `mdt/references/python.md`

**Rule**: Match existing test file naming in the project. If none exists, use the ecosystem default.

**Feature mode**: Tests should be RED (imports fail, modules don't exist yet)
**Prep mode**: Tests should be GREEN (lock existing behavior)

### 2. Write tests.md (Specification)

```markdown
# Tests: {CR-KEY}

**Status**: 🔴 RED (feature) | 🟢 GREEN (prep)

## Module → Test Mapping

| Module | Test File | Tests | Status |
|--------|-----------|-------|--------|
| `ModuleName` | `{test_path}` | N | 🔴 |

## Data Mechanism Tests (if any)

| Pattern | Module | Tests |
|---------|--------|-------|
| "max N" boundary | `Module` | at N-1, N, N+1 |
| format validation | `Module` | valid, invalid, edge cases |

## External Dependency Tests (if any)

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| `{ENV_VAR}` | {test name} | {expected behavior} |

## Constraint Coverage (if any)

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `{test_path}` | {test name} |

## Verify

\`\`\`bash
{test_command}
# Expected: N failed (RED) or N passed (GREEN)
\`\`\`
```

## Common Pitfall

❌ **Don't** generate tests only for method signatures
✅ **Do** extract data mechanisms from architecture and test them explicitly
❌ **Don't** mock 100% of external dependencies
✅ **Do** include at least one real integration test per dependency

## Checklist

- [ ] Architecture exists
- [ ] Mode detected (feature/prep)
- [ ] All modules have interface tests
- [ ] Every runtime source file in architecture.md Structure section has a corresponding test
- [ ] Data mechanisms extracted and tested
- [ ] External dependencies tested with at least one real integration test
- [ ] Constraint IDs from requirements covered (or explicitly N/A)
- [ ] **Test files written** to project test directory
- [ ] **tests.md written** to CR folder
- [ ] Expected state verified (RED/GREEN)

## Completion

**Prep mode**:

```markdown
## Test Specification Complete

**CR**: {CR-KEY}
**Output**: prep/tests.md + test files
**Status**: 🟢 GREEN (locking existing behavior)

**Next**: `/mdt:tasks {CR-KEY} --prep`
```

**Feature mode**:

```markdown
## Test Specification Complete

**CR**: {CR-KEY}
**Output**: [part-X.Y/]tests.md + test files
**Status**: 🔴 RED (awaiting implementation)

**Next**: `/mdt:tasks {CR-KEY}`
```

## Integration

```
/mdt:architecture → defines modules
        ↓
/mdt:tests → tests modules (this workflow)
        ↓
/mdt:tasks → references which tests go GREEN
        ↓
/mdt:implement → makes tests GREEN
```

---
*Context: $ARGUMENTS*
