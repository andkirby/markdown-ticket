# Tasks: MDT-112

**Source**: [MDT-112](../MDT-112-add-code-complexity-metrics-collection-script-for-.md)
**Type**: Feature Enhancement
**Tests**: `tests.md` (33 scenarios)
**Generated**: 2025-12-31

## Initial request user example commands:

run options
1. scripts/metrics/run.sh
2. scripts/metrics/run.sh path/to/[dir or file.ts]

option 1

just run for the files from git diff
```bash
changed_files=$(echo -e "$(git diff --name-only | grep '' && git ls-files --others
--exclude-standard)" | grep -v '/$' | grep '\.ts' | xargs)
tsg --tsconfig . --tsconfig shared --tsconfig mcp-server --tsconfig server --tsconfig
domain-contracts --stdout metrics --include ${changed_files} | grep -v '==='
```
option 2
```bash
 $ tsg --tsconfig . --tsconfig shared --tsconfig mcp-server --tsconfig server --tsconfig
domain-contracts \
     shared/test-lib/ticket \
     --exclude excludeFiles dist \
     --exclude excludeFiles node_modules --stdout metrics | grep -v '==='
```

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `scripts/metrics/` |
| Test command | `./scripts/metrics/tests/test_run.sh` |
| Build command | N/A (shell script, no compilation) |
| File extension | `.sh`, `.confrc`, `.md` |
| Test filter | All tests run via shell script |

## Size Thresholds

| Module | Role | Default | Hard Max | Action |
|--------|------|---------|----------|--------|
| `run.sh` | Orchestration + filtering | 250 | 400 | Flag at 250+, STOP at 400+ |
| `.confrc.sample` | Configuration template | 45 | 65 | Flag at 45+, STOP at 65+ |
| `README.md` | Documentation | 100 | 200 | Flag at 100+, STOP at 200+ |

*(From requirements.md → Size Guidance)*

## Architecture Structure

```
scripts/metrics/
  ├── run.sh           → Main script: git diff, tsg invocation, JSON filtering
  ├── .confrc.sample   → Configuration template with documented defaults
  └── README.md        → Usage documentation
```

**Note**: `.confrc` is optional — created by user to override defaults

## Shared Patterns

| Pattern | Location | Used By |
|---------|----------|---------|
| Threshold configuration | `.confrc.sample` | `run.sh` (sourced at startup) |
| tsg command builder | `run.sh` | Both git diff and path modes |
| Status calculation | `run.sh` | Text and JSON output formatting |

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide further
- Copying threshold defaults instead of sourcing `.confrc.sample` → STOP, use sourcing
- Embedding tsg command pattern in multiple places → STOP, extract to function
- Not using `--tsconfig` from `.confrc` → STOP, respect configuration

## Test Coverage (from tests.md)

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `test_script_file_exists` | FR-10 | Task 1 | 🔴 RED |
| `test_script_is_executable` | FR-10 | Task 1 | 🔴 RED |
| `test_confrc_sample_created` | FR-10 | Task 2 | 🔴 RED |
| `test_confrc_default_values` | FR-8 | Task 2 | 🔴 RED |
| `test_help_flag` | NFR-U1 | Task 1 | 🔴 RED |
| `test_git_diff_mode_no_changes` | FR-1 | Task 4 | 🔴 RED |
| `test_git_diff_mode_with_changes` | FR-1 | Task 4 | 🔴 RED |
| `test_path_mode_directory` | FR-2 | Task 5 | 🔴 RED |
| `test_path_mode_specific_file` | FR-2 | Task 5 | 🔴 RED |
| `test_path_mode_invalid_path` | NFR-R2 | Task 9 | 🔴 RED |
| `test_tsconfig_detection` | FR-6 | Task 5 | 🔴 RED |
| `test_default_shows_yellow_red_only` | FR-3 | Task 6 | 🔴 RED |
| `test_all_flag_disables_filtering` | FR-4 | Task 6 | 🔴 RED |
| `test_mixed_severity_shown` | FR-3 | Task 6 | 🔴 RED |
| `test_default_text_table_output` | FR-7 | Task 7 | 🔴 RED |
| `test_text_table_columns` | FR-7 | Task 7 | 🔴 RED |
| `test_ansi_color_codes` | NFR-U3 | Task 7 | 🔴 RED |
| `test_json_flag_outputs_json` | FR-5 | Task 8 | 🔴 RED |
| `test_json_format_structure` | FR-5 | Task 8 | 🔴 RED |
| `test_json_with_all_flag` | FR-5 | Task 8 | 🔴 RED |
| `test_missing_tsconfig_graceful` | NFR-R1 | Task 9 | 🔴 RED |
| `test_no_typescript_files` | NFR-R3 | Task 9 | 🔴 RED |
| `test_tsg_not_installed` | Error | Task 9 | 🔴 RED |
| `test_exit_code_success` | NFR-U2 | Task 9 | 🔴 RED |
| `test_exit_code_error` | NFR-U2 | Task 9 | 🔴 RED |
| `test_exit_code_red_zone` | NFR-U2 | Task 9 | 🔴 RED |
| `test_custom_confrc_overrides_defaults` | FR-8 | Task 2 | 🔴 RED |
| `test_invalid_confrc_syntax` | FR-8 | Task 9 | 🔴 RED |

**TDD Goal**: All tests RED before implementation, GREEN after respective task

---

## TDD Verification

Before starting:
```bash
./scripts/metrics/tests/test_run.sh
# Expected: 33 tests fail (RED status)
```

After each task:
```bash
./scripts/metrics/tests/test_run.sh
# Task-specific tests should pass, others may still fail
```

---

## Tasks

### Task 1: Create directory structure and run.sh skeleton

**Structure**: `scripts/metrics/run.sh`

**Makes GREEN**:
- `test_script_file_exists`
- `test_script_is_executable`
- `test_help_flag`

**Limits**:
- Default: 80 lines
- Hard Max: 120 lines (skeleton portion)

**Create**:
- `scripts/metrics/` directory
- `run.sh` with shebang (`#!/usr/bin/env bash`)
- Help function with usage message
- Flag parsing (`--help`, `--all`, `--json`)
- Exit on unknown flags
- Set executable permissions (`chmod +x run.sh`)

**Exclude**:
- Actual tsg invocation (Task 4, 5)
- Filtering logic (Task 6)
- Output formatting (Task 7, 8)

**Anti-duplication**:
- Help text should reference `.confrc` configuration — don't embed defaults

**Verify**:
```bash
test -x scripts/metrics/run.sh      # executable
./scripts/metrics/run.sh --help     # shows usage
```

**Done when**:
- [ ] File exists at `scripts/metrics/run.sh`
- [ ] File is executable
- [ ] `--help` shows usage information
- [ ] Size ≤ 80 lines

---

### Task 2: Create .confrc.sample with Microsoft thresholds

**Structure**: `scripts/metrics/.confrc.sample`

**Makes GREEN**:
- `test_confrc_sample_created`
- `test_confrc_default_values`
- `test_custom_confrc_overrides_defaults` (partial)

**Limits**:
- Default: 45 lines
- Hard Max: 65 lines

**Create**:
- `.confrc.sample` with documented defaults
- `TSCONFIGS` variable (`. shared mcp-server server domain-contracts`)
- `MI_YELLOW_MAX=40`, `MI_RED_MAX=20`
- `CC_YELLOW_MIN=11`, `CC_RED_MIN=21`
- `COC_YELLOW_MIN=11`, `COC_RED_MIN=21`
- Inline comments explaining Microsoft standards

**Exclude**:
- Validation logic (happens in run.sh sourcing)
- User's `.confrc` file (optional, created by user)

**Anti-duplication**:
- This is the SINGLE source of truth for defaults
- run.sh sources this file, does NOT embed values

**Verify**:
```bash
source scripts/metrics/.confrc.sample
echo $MI_YELLOW_MAX  # should be 40
echo $CC_RED_MIN      # should be 21
```

**Done when**:
- [ ] File exists at `scripts/metrics/.confrc.sample`
- [ ] Contains all threshold variables
- [ ] Defaults match Microsoft standards
- [ ] Size ≤ 45 lines

---

### Task 3: Implement configuration sourcing in run.sh

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_custom_confrc_overrides_defaults` (complete)
- `test_invalid_confrc_syntax` (partial)

**Limits**:
- Default: 30 lines (config sourcing portion)
- Hard Max: 45 lines

**Add to**:
- Function to source `.confrc` if present, else `.confrc.sample`
- Fallback to built-in defaults if neither exists
- Syntax validation (check for required variables)
- Error message on invalid `.confrc` syntax

**Exclude**:
- Threshold filtering logic (Task 6)
- Actual use of threshold values (Task 6)

**Anti-duplication**:
- Use `source` command, do NOT copy defaults into run.sh
- Built-in defaults should match `.confrc.sample` exactly

**Verify**:
```bash
# Test with .confrc override
echo "MI_YELLOW_MAX=50" > scripts/metrics/.confrc
./scripts/metrics/run.sh --help | grep -q "50" || true
```

**Done when**:
- [ ] Sources `.confrc` if present
- [ ] Falls back to `.confrc.sample`
- [ ] Built-in defaults match sample
- [ ] Size ≤ 30 lines (sourcing portion)

---

### Task 4: Implement git diff file discovery mode

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_git_diff_mode_no_changes`
- `test_git_diff_mode_with_changes`

**Limits**:
- Default: 50 lines
- Hard Max: 75 lines

**Add to**:
- Function to discover changed files via git
- Git command: `git diff --name-only` + `git ls-files --others --exclude-standard`
- Filter to `.ts` files only
- Build tsg command with all tsconfigs from `.confrc`
- Execute tsg and capture output

**Exclude**:
- Path mode logic (Task 5)
- Threshold filtering (Task 6)

**Anti-duplication**:
- Extract `build_tsg_command()` function — reused by Task 5
- Extract `run_tsg_metrics()` function — reused by Task 5

**Verify**:
```bash
# Make a change to a TypeScript file
echo "// test" >> shared/test-lib/ticket/ticket-creator.ts
./scripts/metrics/run.sh | grep -q "ticket-creator.ts"
```

**Done when**:
- [ ] No args mode runs git diff discovery
- [ ] Only changed .ts files analyzed
- [ ] Uses tsconfigs from `.confrc`
- [ ] Size ≤ 50 lines

---

### Task 5: Implement path mode with tsconfig detection

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_path_mode_directory`
- `test_path_mode_specific_file`
- `test_tsconfig_detection`
- `test_path_mode_invalid_path` (partial)

**Limits**:
- Default: 80 lines
- Hard Max: 120 lines

**Add to**:
- Path argument detection (`$1` not a flag)
- tsconfig detection from path prefix:
  - `shared/*` → `shared/tsconfig.json`
  - `server/*` → `server/tsconfig.json`
  - `mcp-server/*` → `mcp-server/tsconfig.json`
  - `domain-contracts/*` → `domain-contracts/tsconfig.json`
  - `src/*` or no prefix → `./tsconfig.json`
- Path validation (exists check)
- Build tsg command with single detected tsconfig
- Reuse `build_tsg_command()` and `run_tsg_metrics()` from Task 4

**Exclude**:
- Threshold filtering (Task 6)
- JSON output format (Task 8)

**Anti-duplication**:
- Use `build_tsg_command()` from Task 4
- Use `run_tsg_metrics()` from Task 4
- Do NOT repeat tsg invocation logic

**Verify**:
```bash
./scripts/metrics/run.sh shared/test-lib/ticket | grep -q "ticket-creator.ts"
./scripts/metrics/run.sh invalid/path  # should exit 1
```

**Done when**:
- [ ] Path argument triggers path mode
- [ ] Correct tsconfig detected per path prefix
- [ ] Invalid path exits with code 1
- [ ] Size ≤ 80 lines

---

### Task 6: Implement threshold filtering logic

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_default_shows_yellow_red_only`
- `test_all_flag_disables_filtering`
- `test_mixed_severity_shown`
- `test_threshold_filtering`

**Limits**:
- Default: 60 lines
- Hard Max: 90 lines

**Add to**:
- Function to calculate status per file:
  - RED if ANY metric in red zone
  - YLW if ANY metric in yellow (and none red)
  - GRN if ALL metrics in green
- Filter function: show file if status not GRN (unless `--all` flag)
- Parse tsg JSON output
- Apply thresholds from `.confrc`

**Exclude**:
- Output formatting (Task 7, 8)
- Exit code based on red zone presence (Task 9)

**Anti-duplication**:
- Extract `calculate_status()` function — used by Task 7, 8, 9
- Extract `should_show_file()` function — used by Task 7, 8

**Verify**:
```bash
# Test with mixed metrics
# (requires test data with various complexity levels)
./scripts/metrics/run.sh | grep -q "RED"
./scripts/metrics/run.sh --all | wc -l  # should show more files
```

**Done when**:
- [ ] Default output shows only yellow/red files
- [ ] `--all` flag shows all files
- [ ] Mixed severity files shown correctly
- [ ] Size ≤ 60 lines

---

### Task 7: Implement text table output with ANSI colors

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_default_text_table_output`
- `test_text_table_columns`
- `test_ansi_color_codes`

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines

**Add to**:
- Text table formatting function
- Columns: FILE (truncated to 55), MI, CC, CoC, Status
- ANSI color codes:
  - RED: `\033[31m`
  - YELLOW: `\033[33m`
  - GREEN: `\033[32m`
  - RESET: `\033[0m`
- Column alignment with padding
- Use `calculate_status()` from Task 6
- Use `should_show_file()` from Task 6

**Exclude**:
- JSON output (Task 8)

**Anti-duplication**:
- Reuse status calculation from Task 6
- Do NOT duplicate status determination logic

**Verify**:
```bash
./scripts/metrics/run.sh 2>&1 | grep -q $'\033['  # ANSI codes present
```

**Done when**:
- [ ] Default output is text table
- [ ] Columns: FILE, MI, CC, CoC, Status
- [ ] ANSI colors applied to status column
- [ ] File paths truncated to 55 chars
- [ ] Size ≤ 100 lines

---

### Task 8: Implement JSON output format

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_json_flag_outputs_json`
- `test_json_format_structure`
- `test_json_with_all_flag`

**Limits**:
- Default: 50 lines
- Hard Max: 75 lines

**Add to**:
- `--json` flag parsing
- JSON output function (pass-through tsg format with filtering)
- Structure: `{"metrics": [{"filePath": "...", "maintainabilityIndex": N, "cyclomaticComplexity": N, "cognitiveComplexity": N}]}`
- Apply same filtering as text mode (unless `--all`)
- Use `should_show_file()` from Task 6

**Exclude**:
- Text table formatting (Task 7)

**Anti-duplication**:
- Use filtering from Task 6
- Do NOT duplicate filter logic

**Verify**:
```bash
./scripts/metrics/run.sh --json | jq .  # valid JSON
./scripts/metrics/run.sh --json | jq '.metrics | length'
```

**Done when**:
- [ ] `--json` flag outputs JSON
- [ ] JSON validates against tsg schema
- [ ] Filtering applied to JSON array
- [ ] `--json --all` shows all files
- [ ] Size ≤ 50 lines

---

### Task 9: Implement error handling and exit codes

**Structure**: `scripts/metrics/run.sh` (extend)

**Makes GREEN**:
- `test_missing_tsconfig_graceful`
- `test_no_typescript_files`
- `test_tsg_not_installed`
- `test_exit_code_success`
- `test_exit_code_error`
- `test_exit_code_red_zone`
- `test_path_mode_invalid_path` (complete)
- `test_invalid_confrc_syntax` (complete)

**Limits**:
- Default: 60 lines
- Hard Max: 90 lines

**Add to**:
- Check for `tsg` CLI installation (`command -v tsg`)
- Handle missing tsconfig files (skip with warning to stderr)
- Handle no .ts files found (output empty, exit 0)
- Exit code logic:
  - 0: Success (no red zone files)
  - 1: Error (invalid path, missing tsg)
  - 2: Red zone files found
- Track red zone presence during filtering
- Invalid `.confrc` syntax handling

**Exclude**:
- N/A (this is final task)

**Anti-duplication**:
- Use `calculate_status()` from Task 6 to detect red zone
- Integrate with existing filtering logic

**Verify**:
```bash
./scripts/metrics/run.sh ; echo $?  # should be 0, 1, or 2
path/to/invalid ; echo $?           # should be 1
```

**Done when**:
- [ ] Missing tsg exits with code 1
- [ ] Invalid path exits with code 1
- [ ] No .ts files exits with code 0
- [ ] Red zone files exits with code 2
- [ ] Missing tsconfig logged to stderr, continues
- [ ] Size ≤ 60 lines

---

### Task 10: Create README.md with usage documentation

**Structure**: `scripts/metrics/README.md`

**Makes GREEN**:
- Documentation requirements from CR

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines

**Create**:
- Usage examples (no args, path arg, flags)
- Configuration reference (`.confrc` variables)
- Output format examples (text table, JSON)
- Threshold explanation (Microsoft standards)
- Exit code reference
- Integration examples

**Exclude**:
- N/A (documentation only)

**Anti-duplication**:
- Reference `.confrc.sample` for defaults
- Do NOT duplicate threshold values

**Verify**:
```bash
test -f scripts/metrics/README.md
wc -l scripts/metrics/README.md  # ≤ 200
```

**Done when**:
- [ ] File exists at `scripts/metrics/README.md`
- [ ] Usage examples documented
- [ ] Configuration reference complete
- [ ] Output formats shown
- [ ] Size ≤ 200 lines

---

### Task 11: Update CLAUDE.md with metrics command reference

**Structure**: `CLAUDE.md` (edit, Development Commands section)

**Makes GREEN**:
- Documentation requirements from CR

**Limits**:
- Default: 10 lines (addition to CLAUDE.md)
- Hard Max: 15 lines

**Add to**:
- New "Metrics" subsection under Development Commands
- Command reference: `scripts/metrics/run.sh`
- Usage examples
- Link to `scripts/metrics/README.md` for full docs

**Exclude**:
- N/A (brief reference only)

**Anti-duplication**:
- Keep reference brief, link to README.md
- Do NOT duplicate full documentation

**Verify**:
```bash
grep -A5 "Metrics" CLAUDE.md | grep -q "run.sh"
```

**Done when**:
- [ ] CLAUDE.md updated with Metrics section
- [ ] Command reference included
- [ ] Link to README.md present
- [ ] Size ≤ 10 lines (addition)

---

## Post-Implementation

### Task 12: Verify no duplication

```bash
# Check for duplicated threshold defaults
grep -r "MI_YELLOW_MAX=40" scripts/metrics/ | cut -d: -f1 | sort | uniq -c
# Should appear exactly once (in .confrc.sample)

# Check for duplicated tsg command building
grep -r "tsg --tsconfig" scripts/metrics/run.sh | wc -l
# Should be minimal (function calls, not inline commands)
```

**Done when**: [ ] Thresholds defined once, tsg command extracted to function

### Task 13: Verify size compliance

```bash
wc -l scripts/metrics/run.sh            # ≤ 400 (hard max)
wc -l scripts/metrics/.confrc.sample    # ≤ 65 (hard max)
wc -l scripts/metrics/README.md         # ≤ 200 (hard max)
```

**Done when**: [ ] No files exceed hard max

### Task 14: Run all tests

```bash
./scripts/metrics/tests/test_run.sh
```

**Done when**: [ ] All 33 tests GREEN

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 11 |
| Estimated total lines | ~855 |
| Hard max total | ~1185 |
| Test scenarios | 33 |
| Requirements covered | FR-1 through FR-10, NFR-P1, NFR-R1-3, NFR-U1-3 |

**Task Execution Order**: T1 → T2 → T3 → T4 + T5 (parallel) → T6 → T7 + T8 (parallel) → T9 → T10 → T11

**Next**: `/mdt:implement MDT-112`
