# MDT Test Specification Workflow (v5)

Generate unit and integration test specifications from architecture design. Produces part-aware tests that validate implementation details.

**Core Principle**: Tests are written AFTER architecture (which defines parts and modules) but BEFORE implementation. They define success criteria at the module level.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

| Mode | Output |
|------|--------|
| **Prep** (`--prep`) | `{TICKETS_PATH}/{CR-KEY}/prep/tests.md` + test files |
| **Multi-part CR** | `{TICKETS_PATH}/{CR-KEY}/part-{X.Y}/tests.md` + test files |
| **Single-part CR** | `{TICKETS_PATH}/{CR-KEY}/tests.md` + test files |

## Mode Detection

| Mode | Input Source | Test Strategy | Expected State |
|------|--------------|---------------|----------------|
| **Feature** | architecture.md | Behavior specification — test modules | RED |
| **Prep** (`--prep`) | existing code + prep/architecture.md | Behavior preservation — lock before refactoring | GREEN |
| **Refactoring** | architecture.md (refactoring CR) | Behavior preservation — lock before changing | GREEN |

## Problem This Solves

After architecture defines components, parts, and modules:
- Each module needs tests before implementation
- Parts need isolated test suites
- Refactoring needs behavior-locking tests
- Implementation needs clear RED→GREEN targets

Unit/integration tests written AFTER architecture ensure:
- Tests align with actual component boundaries
- Part isolation is maintained
- Module interfaces are tested
- Implementation has clear targets

## When to Use

**Use `/mdt:tests`:**
- After `/mdt:architecture` has defined structure
- For each part in multi-part CRs
- Before refactoring to lock module behavior (`--prep`)
- When you need unit/integration tests (not E2E)

**Do NOT use:**
- Before architecture exists (use `/mdt:bdd` for acceptance tests)
- For user-visible behavior tests (use `/mdt:bdd`)
- When no modules/components are defined yet

**Prerequisite**: `architecture.md` must exist (or `prep/architecture.md` for prep mode)

## Critical Rules

1. **Requires architecture** — cannot run without architecture.md defining structure
2. **Part-aware** — each part gets its own tests.md in part folder
3. **Module-level focus** — test components, services, adapters (not user journeys)
4. **Feature mode = RED** — tests should fail until module is implemented
5. **Prep/Refactoring mode = GREEN** — tests must pass against current code
6. **Integration with BDD** — `/mdt:bdd` tests user behavior, `/mdt:tests` tests modules

## Execution Steps

### Step 1: Detect Mode and Load Context

**1a. Load CR:**
```
mdt-all:get_cr mode="full"
```

**1b. Check for prep mode:**

```yaml
if "--prep" in ARGUMENTS:
  mode: "prep"
  architecture_file: "{TICKETS_PATH}/{CR-KEY}/prep/architecture.md"
  output_dir: "{TICKETS_PATH}/{CR-KEY}/prep/"
  tests_file: "{TICKETS_PATH}/{CR-KEY}/prep/tests.md"
  test_expectation: "GREEN"  # Must pass against current code
else:
  mode: "feature"  # or "refactoring" based on CR type
  architecture_file: "{TICKETS_PATH}/{CR-KEY}/architecture.md"
  # output determined by part detection
  test_expectation: "RED"  # or GREEN for refactoring CRs
```

**1c. Verify architecture exists:**

```yaml
if not exists(architecture_file):
  # Check if embedded in CR
  cr_architecture = get_cr_section("Architecture Design")
  if not cr_architecture:
    ERROR: """
    Architecture not found. /mdt:tests requires architecture.md.
    
    Run `/mdt:architecture {CR-KEY}` first to define:
    - Component structure
    - Module boundaries  
    - Part breakdown (if multi-part)
    
    For user-visible acceptance tests without architecture,
    use `/mdt:bdd {CR-KEY}` instead.
    """
    EXIT
```

**1d. Detect parts (if not prep mode):**

```bash
# Check architecture.md for part headers
if mode != "prep":
  parts = grep "^## Part [0-9]+(\.[0-9]+)?:" architecture_file
  
  if parts.count > 0:
    # Multi-part CR
    prompt_for_part_selection(parts)
  else:
    # Single-part CR
    part = null
```

**1e. If parts detected — prompt for selection:**

```markdown
Detected parts in architecture.md:
  - 1.1: Enhanced Project Validation
  - 1.2: Enhanced Ticket Validation  
  - 2: Additional Contracts Migration

Which part to generate tests for? [1.1]: _
```

Accept input formats: `1.1`, `part-1.1`, `Part 1.1`, or `--part 1.1` flag

**1f. Set output paths based on part:**

```yaml
# Multi-part CR
if part:
  output_dir: "{TICKETS_PATH}/{CR-KEY}/part-{part}/"
  tests_file: "{TICKETS_PATH}/{CR-KEY}/part-{part}/tests.md"

# Single-part CR (backward compatible)
else:
  output_dir: "{TICKETS_PATH}/{CR-KEY}/"
  tests_file: "{TICKETS_PATH}/{CR-KEY}/tests.md"
```

**1g. Load part-specific context from architecture.md:**

If multi-part, extract ONLY the selected part section:
- Part overview
- Part-specific Structure
- Part-specific Size Guidance
- Part-specific modules and interfaces

**1h. Determine test expectation by CR type:**

```yaml
if mode == "prep":
  test_expectation: "GREEN"
elif CR.type in ["Refactoring", "Technical Debt"]:
  test_expectation: "GREEN"  # Behavior preservation
else:
  test_expectation: "RED"  # Feature specification
```

**1i. Detect test framework:**

| Language | Common Frameworks | Detection |
|----------|-------------------|-----------|
| TypeScript/JS | Jest, Vitest, Mocha | package.json devDependencies |
| Python | Pytest, unittest | pyproject.toml, requirements-dev.txt |
| Rust | built-in, rstest | Cargo.toml dev-dependencies |
| Go | testing, testify | go.mod, _test.go patterns |

```yaml
test:
  framework: {jest, vitest, pytest, etc.}
  directory: {tests/, __tests__/, test/, src/**/*.test.ts, etc.}
  pattern: {*.test.ts, test_*.py, *_test.go, etc.}
  command: {npm test, pytest, cargo test, go test}
```

### Step 2: Extract Test Subjects from Architecture

**For Feature Mode (from architecture.md):**

Extract modules and their responsibilities:

| Architecture Element | Test Type |
|---------------------|-----------|
| Component/Module | Unit tests for public interface |
| Service | Integration tests for dependencies |
| Adapter | Integration tests for external systems |
| Shared utilities | Unit tests for helpers |
| Validators | Unit tests for validation rules |

**From part-specific Structure section:**
```markdown
## Part 1.1 Structure
domain-contracts/src/project/
├── schema.ts      → Unit: schema validation
├── validation.ts  → Unit: validation rules
├── migration.ts   → Integration: migration process
└── index.ts       → Unit: exports
```

**For Prep/Refactoring Mode (from code analysis):**

Identify current module behaviors to preserve:

1. Public function signatures
2. Return value shapes
3. Error types and conditions
4. Side effects (if any)
5. Edge case handling

### Step 3: Generate Test Specifications

**Test Specification Template:**

```typescript
/**
 * Tests for: {CR-KEY} {Part X.Y if applicable}
 * Module: {module name from architecture}
 * Generated by: /mdt:tests
 * Status: {RED (implementation pending) | GREEN (behavior locked)}
 */

describe('{Module name}', () => {
  describe('{public method/function}', () => {
    // Happy path
    it('should {expected behavior} when {condition}', () => {
      // Arrange
      // Act  
      // Assert
    });

    // Error cases
    it('should throw {ErrorType} when {invalid condition}', () => {
      // Arrange
      // Act & Assert
    });

    // Edge cases
    it('should handle {edge case}', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Coverage Requirements per Module:**

| Module Type | Minimum Tests |
|-------------|---------------|
| Public function | 1 happy path + 1 error + edge cases |
| Class/Service | Constructor + each public method |
| Validator | 1 valid + 1 invalid per rule |
| Adapter | 1 success + 1 failure per operation |

### Step 4: Generate Executable Test Files

**4a. Create test file structure:**

```
{test_directory}/
└── {CR-KEY}/                    # or integrated into existing structure
    └── part-{X.Y}/              # if multi-part
        ├── {module-a}.test.{ext}
        ├── {module-b}.test.{ext}
        └── helpers/
            └── fixtures.{ext}
```

**4b. Generate test code (framework-specific):**

**Jest/Vitest (TypeScript):**
```typescript
/**
 * Tests for: {CR-KEY} Part {X.Y}
 * Module: {module name}
 * Architecture: {path in structure}
 * Generated by: /mdt:tests
 * Status: RED (implementation pending)
 */
import { describe, it, expect, beforeEach } from 'vitest';
// Import will fail until module exists (RED state)
import { ModuleName } from '@/path/to/module';

describe('ModuleName', () => {
  describe('publicMethod', () => {
    it('should return expected result for valid input', () => {
      // Arrange
      const input = { /* valid data */ };
      
      // Act
      const result = ModuleName.publicMethod(input);
      
      // Assert
      expect(result).toEqual(/* expected */);
    });

    it('should throw ValidationError for invalid input', () => {
      // Arrange
      const invalidInput = { /* invalid data */ };
      
      // Act & Assert
      expect(() => ModuleName.publicMethod(invalidInput))
        .toThrow(ValidationError);
    });
  });
});
```

**Pytest (Python):**
```python
"""
Tests for: {CR-KEY} Part {X.Y}
Module: {module name}
Architecture: {path in structure}
Generated by: /mdt:tests
Status: RED (implementation pending)
"""
import pytest
# Import will fail until module exists (RED state)
from package.module import ModuleName


class TestModuleName:
    """Unit tests for ModuleName"""

    class TestPublicMethod:
        """Tests for public_method"""

        def test_returns_expected_for_valid_input(self):
            """should return expected result for valid input"""
            # Arrange
            input_data = {}  # valid data
            
            # Act
            result = ModuleName.public_method(input_data)
            
            # Assert
            assert result == expected

        def test_raises_for_invalid_input(self):
            """should raise ValidationError for invalid input"""
            # Arrange
            invalid_input = {}
            
            # Act & Assert
            with pytest.raises(ValidationError):
                ModuleName.public_method(invalid_input)
```

### Step 5: Verify Test State

**For Feature Mode (expect RED):**

```bash
{test_command} --filter="{CR-KEY}"
# Or for multi-part:
{test_command} --filter="part-{X.Y}"
```

Expected output:
```
Tests: X failed, 0 passed
```

Tests fail because modules don't exist yet. This is correct.

If tests pass → investigate:
- Module already exists?
- Test is too loose?
- Duplicate functionality?

**For Prep/Refactoring Mode (expect GREEN):**

```bash
{test_command} --filter="{CR-KEY}"
```

Expected output:
```
Tests: 0 failed, X passed
```

Tests pass because they lock existing behavior.

If tests fail → investigate:
- Test incorrect?
- Bug in current code?
- Behavior actually broken?

### Step 6: Generate tests.md

**Create output directory if needed:**
```bash
mkdir -p "{output_dir}"
```

**Generate tests.md:**

```markdown
# Tests: {CR-KEY} {Part X.Y if applicable}

**Mode**: {Feature | Prep | Refactoring}
**Part**: {X.Y - Part Title | N/A}
**Source**: architecture.md {→ Part X.Y section}
**Generated**: {timestamp}
**Status**: {🔴 RED (implementation pending) | 🟢 GREEN (behavior locked)}

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | {jest, vitest, pytest, etc.} |
| Test Directory | `{path}` |
| Test Command | `{command}` |
| Filter | `--filter="{pattern}"` |

## Architecture → Test Mapping

| Module | Path | Test File | Tests | Status |
|--------|------|-----------|-------|--------|
| `{ModuleName}` | `{src/path}` | `{test/path}` | {N} | {🔴/🟢} |
| `{ModuleName2}` | `{src/path}` | `{test/path}` | {N} | {🔴/🟢} |

## Test Specifications

### Module: {ModuleName}

**Source**: `{architecture path}`
**Test File**: `{test_directory}/{module}.test.{ext}`
**Size Limit**: {N} lines (from architecture)

#### Public Interface Tests

| Method | Test | Type | Status |
|--------|------|------|--------|
| `{method}` | valid input returns expected | Happy path | 🔴 |
| `{method}` | invalid input throws error | Error | 🔴 |
| `{method}` | edge case handled | Edge case | 🔴 |

#### Test Code

```typescript
describe('{ModuleName}', () => {
  describe('{method}', () => {
    it('should {behavior}', () => {
      // Test implementation
    });
  });
});
```

---

### Module: {ModuleName2}

{Continue for all modules in part...}

---

## Edge Cases

| Module | Scenario | Expected Behavior | Test |
|--------|----------|-------------------|------|
| `{module}` | {edge case} | {handling} | `{test name}` |

## Generated Test Files

| File | Module | Tests | Lines | Status |
|------|--------|-------|-------|--------|
| `{path}` | `{module}` | {N} | ~{N} | {🔴/🟢} |

## Verification

Run tests:
```bash
{test_command} --filter="{pattern}"
```

**Expected**: 
{Feature}: `{N} failed, 0 passed` (RED until implemented)
{Prep/Refactoring}: `{N} passed, 0 failed` (GREEN, behavior locked)

---

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task | Module | Makes GREEN |
|------|--------|-------------|
| Task {N}.1 | `{module}` | `{test file}` ({N} tests) |
| Task {N}.2 | `{module}` | `{test file}` ({N} tests) |

After each task: run `{test_command}` — failures should decrease.

---

## Relationship to BDD Tests

| Test Type | Command | Tests | When Runs |
|-----------|---------|-------|-----------|
| BDD/E2E | `/mdt:bdd` | User journeys | After full feature |
| Unit/Integration | `/mdt:tests` | Modules | After each task |

BDD tests validate user-visible behavior.
These tests validate module implementation.

---
*Generated by /mdt:tests v5*
```

### Step 7: Save and Report

**7a. Save test files** to project test directory

**7b. Save tests.md** to appropriate path:
- Prep: `{TICKETS_PATH}/{CR-KEY}/prep/tests.md`
- Multi-part: `{TICKETS_PATH}/{CR-KEY}/part-{X.Y}/tests.md`
- Single-part: `{TICKETS_PATH}/{CR-KEY}/tests.md`

**7c. Report:**

```markdown
## Tests Generated: {CR-KEY} {Part X.Y if applicable}

| Metric | Value |
|--------|-------|
| Mode | {Feature / Prep / Refactoring} |
| Part | {X.Y - Title / N/A} |
| Modules covered | {N} |
| Test files created | {N} |
| Total tests | {N} |
| Expected State | {🔴 RED / 🟢 GREEN} |

**Output**: `{tests_file}`

**Test files**:
- `{path/to/module1.test.ext}`
- `{path/to/module2.test.ext}`

**Verify**:
```bash
{test_command} --filter="{pattern}"
# Expected: {N} {failed|passed}
```

**Next Steps**:
{Feature mode}:
- Verify tests are RED (imports fail)
- Run `/mdt:tasks {CR-KEY}` — tasks will make tests GREEN

{Prep mode}:
- Verify tests are GREEN (behavior locked)
- Run `/mdt:tasks {CR-KEY} --prep` — refactoring tasks

{Multi-part}:
- Continue with `/mdt:tasks {CR-KEY} --part {X.Y}`
- Or generate tests for next part: `/mdt:tests {CR-KEY} --part {next}`
```

---

## Examples

### Example 1: Feature Mode (Single Part)

**Input**: `/mdt:tests MDT-050`

**architecture.md contains** (embedded or extracted):
```markdown
### Structure
src/services/
└── user-service.ts  → Business logic

### Size Guidance
| Module | Limit |
|--------|-------|
| user-service.ts | 200 |
```

**Output**:
```markdown
# Tests: MDT-050

**Mode**: Feature
**Status**: 🔴 RED

## Architecture → Test Mapping

| Module | Path | Test File | Tests | Status |
|--------|------|-----------|-------|--------|
| `UserService` | `src/services/user-service.ts` | `tests/user-service.test.ts` | 8 | 🔴 |
```

### Example 2: Multi-Part Feature

**Input**: `/mdt:tests MDT-101 --part 1.1`

**architecture.md contains**:
```markdown
## Part 1.1: Enhanced Project Validation

### Structure
domain-contracts/src/project/
├── schema.ts
├── validation.ts
└── index.ts
```

**Output**:
- Location: `{TICKETS_PATH}/MDT-101/part-1.1/tests.md`
- Tests for: schema.ts, validation.ts modules only

### Example 3: Prep Mode

**Input**: `/mdt:tests MDT-102 --prep`

**prep/architecture.md contains** refactoring design.

**Output**:
- Location: `{TICKETS_PATH}/MDT-102/prep/tests.md`
- Tests lock current behavior (must be GREEN)
- Used to verify refactoring doesn't break anything

---

## Validation Checklist

Before completing `/mdt:tests`:

- [ ] Architecture exists (architecture.md or prep/architecture.md)
- [ ] Mode correctly detected (feature / prep / refactoring)
- [ ] Part correctly detected (or single-part fallback)
- [ ] Test framework detected from project config
- [ ] All modules from architecture have test coverage
- [ ] Tests follow module structure from architecture
- [ ] Test files generated with correct imports
- [ ] Expected state verified (RED for feature, GREEN for prep)
- [ ] tests.md saved to correct folder

## Integration

**Requires**: 
- `architecture.md` (from `/mdt:architecture`)
- OR `prep/architecture.md` (from `/mdt:architecture --prep`)

**Optionally consumes**:
- `requirements.md` — for requirement traceability
- `bdd.md` — for test relationship documentation

**Output consumed by**:
- `/mdt:tasks` — tasks reference which tests they make GREEN
- `/mdt:implement` — verifies tests pass after each task

**Workflow position**:
```
/mdt:requirements
        ↓
/mdt:bdd ←────────── User-visible behavior (E2E)
        ↓
/mdt:architecture ←── Defines modules and parts
        ↓
/mdt:tests ←───────── Module-level tests (unit/integration)
        ↓
/mdt:tasks
        ↓
/mdt:implement
```

**Prep workflow position**:
```
/mdt:assess
        ↓
/mdt:bdd --prep (optional)
        ↓
/mdt:architecture --prep
        ↓
/mdt:tests --prep ←── Lock module behavior
        ↓
/mdt:tasks --prep
        ↓
/mdt:implement --prep
```

## Error Handling

**No architecture found:**
```markdown
❌ Architecture not found

`/mdt:tests` requires architecture.md to define modules and structure.

**Options**:
1. Run `/mdt:architecture {CR-KEY}` first
2. For acceptance tests without architecture, use `/mdt:bdd {CR-KEY}`
```

**Part not found:**
```markdown
❌ Part {X.Y} not found in architecture.md

Available parts:
- 1.1: Enhanced Project Validation
- 1.2: Enhanced Ticket Validation

Run: `/mdt:tests {CR-KEY} --part {available_part}`
```

Context: $ARGUMENTS
