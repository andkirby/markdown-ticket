# MDT Test Specification Workflow (v3)

Generate BDD test specifications and executable test files from requirements or behavioral assessment.

**Core Principle**: Tests are written BEFORE implementation. They define success criteria, not verify after-the-fact.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

- **Prep mode** (`--prep`): `{TICKETS_PATH}/{CR-KEY}/prep/tests.md`
- **Phased CR**: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tests.md`
- **Non-phased CR**: `{TICKETS_PATH}/{CR-KEY}/tests.md`
- **Test files**: Project's test directory (detected from config)

## Mode Detection

| Mode | Input Source | Test Strategy |
|------|--------------|---------------|
| **Prep** (`--prep`) | existing code | Behavior preservation — lock before refactoring |
| Feature | requirements.md | Behavior specification — test what SHOULD happen |
| Refactoring | assess output + existing code | Behavior preservation — test what CURRENTLY happens |
| Tech Debt | assess output + existing code | Behavior preservation — lock before changing |

## Critical Rules

1. **Tests before code** — Generate failing tests, implementation makes them pass
2. **Integration/E2E focus** — Test from public interface, not internals
3. **BDD format** — Given/When/Then scenarios derived from EARS specs
4. **Traceability** — Every test traces to requirement or behavior
5. **Phase isolation** — Each phase gets its own tests.md in phase folder
6. **Prep tests must pass** — Prep mode locks current behavior (tests should be GREEN)

## Execution Steps

### Step 1: Detect Mode and Load Context

**1a. Load CR:**
```
mdt-all:get_cr mode="full"
```

**1b. Check for prep mode:**

```bash
# If --prep flag in arguments
if [[ "$ARGUMENTS" == *"--prep"* ]]; then
  mode="prep"
  output_dir="{TICKETS_PATH}/{CR-KEY}/prep/"
  tests_file="{TICKETS_PATH}/{CR-KEY}/prep/tests.md"
  # Prep tests lock current behavior — should be GREEN
  test_expectation="GREEN"
  # Skip phase detection
fi
```

**1c. Detect phases in architecture (if not prep mode):**

```bash
# Check for architecture.md
arch_file="{TICKETS_PATH}/{CR-KEY}/architecture.md"

if [ -f "$arch_file" ]; then
  # Extract phase headers: "## Phase 1.1:" or "## Phase 2:"
  phases=$(grep -oE "^## Phase [0-9]+(\.[0-9]+)?:" "$arch_file" | \
           sed 's/## Phase \([0-9.]*\):.*/\1/' | sort -V)
fi
```

**1d. If phases detected — prompt for selection:**

```markdown
Detected phases in architecture.md:
  - 1.1: Enhanced Project Validation
  - 1.2: Enhanced Ticket Validation
  - 2: Additional Contracts Migration

Which phase to generate tests for? [1.1]: _
```

Accept input formats: `1.1`, `phase-1.1`, `Phase 1.1`

**1d. Set output paths based on phase:**

```yaml
# Phased CR
phase: "1.1"
output_dir: "{TICKETS_PATH}/{CR-KEY}/phase-1.1/"
tests_file: "{TICKETS_PATH}/{CR-KEY}/phase-1.1/tests.md"

# Non-phased CR (backward compatible)  
phase: null
output_dir: "{TICKETS_PATH}/{CR-KEY}/"
tests_file: "{TICKETS_PATH}/{CR-KEY}/tests.md"
```

**1e. Load phase-specific context from architecture.md:**

If phased, extract ONLY the selected phase section:
- Phase overview
- Phase-specific Structure
- Phase-specific Size Guidance
- Phase-specific Validation Rules / Requirements

Example extraction for Phase 1.1:
```markdown
## Phase 1.1: Enhanced Project Validation

### Overview
Phase 1.1 extends the Project schema with comprehensive validation...

### Enhanced Structure
domain-contracts/src/project/
├── schema.ts
├── validation.ts
├── migration.ts
└── index.ts

### Validation Rules Specification
...
```

**1f. Determine test mode:**

```
IF {TICKETS_PATH}/{CR-KEY}/requirements.md exists:
  MODE = "feature"
  Load requirements.md
ELSE IF CR type is "Bug Fix" or contains refactoring keywords:
  MODE = "refactoring"  
  Load assess output if exists
ELSE:
  MODE = "feature"
  Warn: "No requirements.md found — generate from CR/phase description"
```

**1g. Detect test framework:**

From project config (package.json, pyproject.toml, Cargo.toml, etc.):

| Language | Common Frameworks | Detection |
|----------|-------------------|-----------|
| TypeScript/JS | Jest, Vitest, Mocha | package.json devDependencies |
| Python | Pytest, unittest | pyproject.toml, requirements-dev.txt |
| Rust | built-in, rstest | Cargo.toml dev-dependencies |
| Go | testing, testify | go.mod, _test.go patterns |

```yaml
test:
  framework: {jest, pytest, etc.}
  directory: {tests/, __tests__/, test/, etc.}
  pattern: {*.test.ts, test_*.py, *_test.go, etc.}
  command: {npm test, pytest, cargo test, go test}
```

### Step 2: Extract Test Subjects

**For Feature Mode (from requirements.md or phase description):**

Parse EARS specifications or phase requirements:

| EARS Type | Maps To |
|-----------|---------|
| WHEN `<trigger>` THEN `<response>` | Happy path scenario |
| IF `<condition>` THEN `<response>` | Conditional scenario |
| WHILE `<state>` the system shall | State-based scenario |
| WHERE `<feature>` is not available | Fallback scenario |

**For phased architecture without requirements.md:**

Extract testable requirements from phase section:
- "Validation Rules Specification" → test each rule
- "Enhanced Structure" → test each new module exists
- "Error Handling Strategy" → test each error scenario

Example extraction from Phase 1.1:
```markdown
## From Phase 1.1 Validation Rules:

**Required Fields:**
- `name`: Non-empty string, trimmed length > 0
- `code`: Non-empty string, trimmed length > 0

→ Scenario: required_field_validation
  Given: project config missing name
  When: validated
  Then: throws ValidationError with field "name"

**Pattern Validation:**
- `code`: Must match `^[A-Z][A-Z0-9]{1,4}$`

→ Scenario: code_pattern_validation
  Given: project config with code "mdt" (lowercase)
  When: validated
  Then: throws ValidationError with pattern hint
```

**For Refactoring Mode (from code analysis):**

Identify current behaviors to preserve:

1. Public function signatures
2. Return value shapes
3. Error conditions and codes
4. Side effects (file writes, API calls, events)
5. Edge case handling

### Step 3: Generate BDD Scenarios

**Scenario Template:**

```gherkin
Feature: {Feature name from requirement group or phase}

  Background:
    Given {common setup}

  @requirement:{R-ID} OR @phase:{X.Y}
  Scenario: {descriptive_name}
    Given {initial context}
    When {action taken}
    Then {expected outcome}
    And {additional assertions}

  @requirement:{R-ID} OR @phase:{X.Y}
  Scenario: {edge_case_name}
    Given {edge condition}
    When {action taken}
    Then {expected handling}
```

**Coverage Requirements:**

| Requirement Type | Minimum Scenarios |
|------------------|-------------------|
| Happy path (WHEN...THEN) | 1 success + 1 variation |
| Conditional (IF...THEN) | 1 per condition branch |
| Error handling | 1 per error type |
| State-based (WHILE) | Entry, during, exit states |
| Validation rule | 1 valid + 1 invalid per rule |

### Step 4: Generate Executable Test Files

**4a. Create test file structure:**

```
{test_directory}/
└── {CR-KEY}/                    # or integrated into existing structure
    ├── {feature-a}.test.{ext}
    ├── {feature-b}.test.{ext}
    └── helpers/
        └── fixtures.{ext}
```

For phased CRs, organize by phase if helpful:
```
{test_directory}/
└── {CR-KEY}/
    └── phase-{X.Y}/
        ├── {feature}.test.{ext}
        └── fixtures.{ext}
```

**4b. Generate test code (framework-specific):**

**Jest/Vitest (TypeScript):**
```typescript
/**
 * Tests for: {CR-KEY} Phase {X.Y}
 * Phase: {Phase Title}
 * Requirements: {R1.1, R1.2, ...} OR derived from phase spec
 * Generated by: /mdt:tests
 * Status: RED (implementation pending)
 */

describe('{Feature name}', () => {
  // @phase: {X.Y} @requirement: P{X.Y}-1
  describe('when valid project code provided', () => {
    it('should accept uppercase 3-5 char codes', async () => {
      // Arrange
      const config = { code: 'MDT', name: 'Test', active: true };
      
      // Act
      const result = ProjectSchema.safeParse(config);
      
      // Assert
      expect(result.success).toBe(true);
    });

    it('should reject lowercase codes', async () => {
      const config = { code: 'mdt', name: 'Test', active: true };
      const result = ProjectSchema.safeParse(config);
      
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain('code');
    });
  });
});
```

**Pytest (Python):**
```python
"""
Tests for: {CR-KEY} Phase {X.Y}
Phase: {Phase Title}
Requirements: derived from phase spec
Generated by: /mdt:tests
Status: RED (implementation pending)
"""
import pytest
from domain_contracts.project import ProjectSchema


class TestProjectValidation:
    """Feature: Project Schema Validation (Phase {X.Y})"""

    # @phase: {X.Y}
    class TestCodePattern:
        """Project code pattern validation"""

        def test_accepts_uppercase_codes(self):
            """should accept uppercase 3-5 char codes"""
            config = {"code": "MDT", "name": "Test", "active": True}
            result = ProjectSchema.parse(config)
            assert result.code == "MDT"

        def test_rejects_lowercase_codes(self):
            """should reject lowercase codes"""
            config = {"code": "mdt", "name": "Test", "active": True}
            with pytest.raises(ValidationError) as exc:
                ProjectSchema.parse(config)
            assert "code" in str(exc.value)
```

### Step 5: Verify Tests are RED

After generating test files:

```bash
{test_command} --filter={CR-KEY}
# Or for phased:
{test_command} --filter="phase-{X.Y}"
```

Expected output:
```
Tests: X failed, 0 passed
```

If any tests pass before implementation → investigate:
- Is there existing code that satisfies this?
- Is the test too loose?
- Is this a duplicate requirement?

### Step 6: Generate tests.md

**Create output directory if phased:**
```bash
mkdir -p "{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}"
```

**Generate tests.md:**

```markdown
# Tests: {CR-KEY} Phase {X.Y}

**Mode**: {Feature | Refactoring}
**Phase**: {X.Y} - {Phase Title}
**Source**: architecture.md → Phase {X.Y}
**Generated**: {timestamp}
**Scope**: Phase {X.Y} only

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | {jest, pytest, etc.} |
| Test Directory | `{path}` |
| Test Command | `{command}` |
| Phase Filter | `--testPathPattern="phase-{X.Y}"` |
| Status | 🔴 RED (implementation pending) |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| P{X.Y}-1 | Code pattern validation | `validation.test.ts` | 3 | 🔴 RED |
| P{X.Y}-2 | Required fields | `validation.test.ts` | 2 | 🔴 RED |
| P{X.Y}-3 | Migration support | `migration.test.ts` | 4 | 🔴 RED |

## Test Specifications

### Feature: {Feature Name}

**File**: `{test_directory}/{feature}.test.{ext}`
**Covers**: P{X.Y}-1, P{X.Y}-2

#### Scenario: code_pattern_validation (P{X.Y}-1)

```gherkin
Given a project configuration object
When the code field is set
Then it must match pattern ^[A-Z][A-Z0-9]{1,4}$
And valid codes: MDT, API1, WEB, Z2
And invalid codes: mdt, api_01, A, ABCDEFG
```

**Test**: `describe('code field validation') > it('accepts valid project codes')`

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Empty code | ValidationError | `validation.test.ts` | P{X.Y}-1 |
| Code too long | ValidationError | `validation.test.ts` | P{X.Y}-1 |
| Missing required field | ValidationError | `validation.test.ts` | P{X.Y}-2 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `{test_dir}/validation.test.ts` | 8 | ~200 | 🔴 RED |
| `{test_dir}/migration.test.ts` | 6 | ~180 | 🔴 RED |

## Verification

Run Phase {X.Y} tests (should all fail):
```bash
{test_command} --testPathPattern="phase-{X.Y}"
```

Expected: **{N} failed, 0 passed**

## Coverage Checklist

- [x] All phase requirements have at least one test
- [x] Error scenarios covered
- [x] Edge cases documented
- [ ] Tests are RED (verified manually)

---

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Task 1.1 | `validation.test.ts` (P{X.Y}-1, P{X.Y}-2) |
| Task 1.2 | `migration.test.ts` (P{X.Y}-3) |

After each task: `{test_command}` should show fewer failures.
```

### Step 7: Save and Report

**7a. Save test files** to project test directory

**7b. Save tests.md** to phase-aware path:
- Phased: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tests.md`
- Non-phased: `{TICKETS_PATH}/{CR-KEY}/tests.md`

**7c. Report:**

```markdown
## Tests Generated: {CR-KEY} Phase {X.Y}

| Metric | Value |
|--------|-------|
| Mode | {Feature / Refactoring} |
| Phase | {X.Y} - {Phase Title} |
| Requirements covered | {N} |
| Test files created | {N} |
| Total scenarios | {N} |
| Status | 🔴 All RED |

**Output location**: `{TICKETS_PATH}/{CR-KEY}/phase-{X.Y}/tests.md`

**Test files**:
- `{path/to/test1.test.ext}`
- `{path/to/test2.test.ext}`

**Verify RED**:
```bash
{test_command} --testPathPattern="phase-{X.Y}"
# Expected: {N} failed, 0 passed
```

**Next**: `/mdt:tasks {CR-KEY}` — will auto-detect phase from tests.md location
```

---

## Refactoring Mode Details

When MODE = "refactoring", test generation differs:

### Step 2 (Refactoring): Analyze Current Behavior

```markdown
## Behavioral Analysis: {file}

### Public Interface

| Export | Signature | Current Behavior |
|--------|-----------|------------------|
| `getUser` | `(id: string) => Promise<User>` | Returns user or throws NotFoundError |

### Error Contracts

| Function | Error Type | Condition |
|----------|------------|-----------|
| `getUser` | `NotFoundError` | User ID doesn't exist |

### Discovered Behaviors (undocumented)

From code analysis:
- `getUser` caches results for 5 minutes
- Empty string ID treated as null
```

### Step 4 (Refactoring): Preservation Tests

```typescript
/**
 * Behavioral Preservation Tests
 * Source: Code analysis
 * Purpose: Lock current behavior before refactoring
 * 
 * ⚠️ These tests document CURRENT behavior, not DESIRED behavior.
 */
describe('getUser - behavioral preservation', () => {
  it('returns user object with expected shape', async () => {
    const user = await getUser('user-123');
    expect(user).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
    });
  });

  it('throws NotFoundError for missing user', async () => {
    await expect(getUser('nonexistent'))
      .rejects
      .toBeInstanceOf(NotFoundError);
  });
});
```

---

## Phase Detection Examples

### Example 0: Prep Mode

User runs: `/mdt:tests MDT-101 --prep`

Output:
```
Prep mode activated.
Analyzing files targeted for refactoring...
Generating behavior preservation tests...

Output: {TICKETS_PATH}/MDT-101/prep/tests.md

✔ Tests should pass against CURRENT code (locking behavior)
```

### Example 1: Phased Architecture CR

```markdown
# architecture.md

## Phase 1.1: Enhanced Project Validation
...validation rules...

## Phase 1.2: Enhanced Ticket Validation  
...ticket rules...

## Phase 2: Additional Contracts
...more contracts...
```

User runs: `/mdt:tests MDT-101`

Output:
```
Detected phases in architecture.md:
  - 1.1: Enhanced Project Validation
  - 1.2: Enhanced Ticket Validation
  - 2: Additional Contracts

Which phase to generate tests for? [1.1]: 1.1

Generating tests for Phase 1.1...
Output: {TICKETS_PATH}/MDT-101/phase-1.1/tests.md
```

### Example 2: Non-Phased CR (Backward Compatible)

```markdown
# CR or architecture.md without ## Phase headers
```

User runs: `/mdt:tests MDT-050`

Output:
```
No phases detected. Generating tests...
Output: {TICKETS_PATH}/MDT-050/tests.md
```

### Example 3: Direct Phase Selection

User runs: `/mdt:tests MDT-101 --phase 1.2`

Output:
```
Generating tests for Phase 1.2...
Output: {TICKETS_PATH}/MDT-101/phase-1.2/tests.md
```

---

## Integration with Downstream Prompts

### `/mdt:tasks` Receives

`/mdt:tasks` will auto-discover phase from tests.md location:

```bash
# Finds: {TICKETS_PATH}/MDT-101/phase-1.1/tests.md
# Outputs: {TICKETS_PATH}/MDT-101/phase-1.1/tasks.md
```

### `/mdt:implement` Verifies

```bash
# Loads: {TICKETS_PATH}/MDT-101/phase-1.1/tasks.md
# References: {TICKETS_PATH}/MDT-101/phase-1.1/tests.md
```

---

## Validation Checklist

Before completing `/mdt:tests`:

- [ ] Mode correctly detected (prep / feature / refactoring)
- [ ] Phase correctly detected (or non-phased / prep fallback)
- [ ] Test framework detected from project config
- [ ] All requirements/behaviors have test coverage
- [ ] BDD scenarios in Gherkin format
- [ ] Executable test files generated
- [ ] Tests verified as correct state (RED for feature, GREEN for prep/refactoring)
- [ ] tests.md saved to correct folder (`prep/` or `phase-{X.Y}/` or root)
- [ ] Requirement mapping prepared for `/mdt:tasks`

Context: $ARGUMENTS
