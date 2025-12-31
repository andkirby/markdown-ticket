# Tests: MDT-112

**Mode**: Feature
**Source**: requirements.md
**Generated**: 2025-12-31
**Scope**: Full CR (non-phased)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Bash (integration tests) |
| Test Directory | `scripts/metrics/tests/` |
| Test Command | `./scripts/metrics/tests/test_run.sh` |
| Status | RED (implementation pending) |

## Requirement Test Mapping

| Req ID | Description | Test Function | Scenarios | Status |
|--------|-------------|---------------|-----------|--------|
| FR-1 | Git diff file discovery | `test_git_diff_mode_*` | 2 | RED |
| FR-2 | Path argument support | `test_path_mode_*` | 4 | RED |
| FR-3 | Yellow/red filtering | `test_default_shows_yellow_red_only`, `test_threshold_filtering`, `test_mixed_severity_shown` | 3 | RED |
| FR-4 | `--all` flag | `test_all_flag_disables_filtering` | 1 | RED |
| FR-5 | `--json` flag | `test_json_flag_outputs_json`, `test_json_format_structure`, `test_json_with_all_flag` | 3 | RED |
| FR-6 | tsconfig detection | `test_tsconfig_detection` | 1 | RED |
| FR-7 | Text table output | `test_default_text_table_output`, `test_text_table_columns`, `test_ansi_color_codes` | 3 | RED |
| FR-8 | `.confrc` configuration | `test_confrc_default_values`, `test_custom_confrc_overrides_defaults`, `test_invalid_confrc_syntax` | 3 | RED |
| FR-9 | tsconfig list in `.confrc` | `test_confrc_sample_created` | 1 | RED |
| FR-10 | `.confrc.sample` template | `test_confrc_sample_created`, `test_confrc_default_values` | 2 | RED |
| NFR-P1 | Performance < 5s | Manual verification | 1 | Pending |
| NFR-R1 | Missing tsconfig handling | `test_missing_tsconfig_graceful` | 1 | RED |
| NFR-R2 | Invalid path handling | `test_path_mode_invalid_path` | 1 | RED |
| NFR-R3 | No .ts files handling | `test_no_typescript_files` | 1 | RED |
| NFR-U1 | Help output | `test_help_flag` | 1 | RED |
| NFR-U2 | Exit codes | `test_exit_code_success`, `test_exit_code_error`, `test_exit_code_red_zone` | 3 | RED |
| NFR-U3 | Colored output | `test_ansi_color_codes` | 1 | RED |

## Test Specifications

### Feature: Script Creation and Configuration

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-8, FR-9, FR-10

#### Scenario: script_file_exists (FR-10)

```gherkin
Given the project structure
When the metrics script is implemented
Then scripts/metrics/run.sh should exist
And the file should be executable
```

**Test**: `test_script_file_exists()`

#### Scenario: confrc_sample_created (FR-10)

```gherkin
Given the metrics script exists
When the script is run for the first time
Then .confrc.sample should be created
And it should contain all threshold variables
And it should contain documented defaults
```

**Test**: `test_confrc_sample_created()`

#### Scenario: confrc_default_values (FR-8)

```gherkin
Given .confrc.sample exists
When reading the configuration
Then MI_YELLOW_MAX should be 40 (Microsoft standard)
And MI_RED_MAX should be 20
And CC_YELLOW_MIN should be 11
And CC_RED_MIN should be 21
And COC_YELLOW_MIN should be 11
And COC_RED_MIN should be 21
```

**Test**: `test_confrc_default_values()`

---

### Feature: Git Diff Mode

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-1

#### Scenario: git_diff_mode_no_changes (FR-1)

```gherkin
Given no TypeScript files have changed
When running scripts/metrics/run.sh without arguments
Then the script should execute successfully
And output should be empty table/array
And exit code should be 0
```

**Test**: `test_git_diff_mode_no_changes()`

#### Scenario: git_diff_mode_with_changes (FR-1)

```gherkin
Given TypeScript files have been modified
When running scripts/metrics/run.sh without arguments
Then only changed .ts files should be analyzed
And output should show metrics for changed files
```

**Test**: `test_git_diff_mode_with_changes()`

---

### Feature: Path-Based Mode

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-2, FR-6

#### Scenario: path_mode_directory (FR-2)

```gherkin
Given a valid directory path
When running scripts/metrics/run.sh shared/test-lib/ticket
Then all .ts files in that directory should be analyzed
And the correct tsconfig should be detected
```

**Test**: `test_path_mode_directory()`

#### Scenario: path_mode_specific_file (FR-2)

```gherkin
Given a valid .ts file path
When running scripts/metrics/run.sh with the file path
Then only that file should be analyzed
And the correct tsconfig should be detected
```

**Test**: `test_path_mode_specific_file()`

#### Scenario: path_mode_invalid_path (NFR-R2)

```gherkin
Given an invalid path argument
When running scripts/metrics/run.sh with invalid path
Then usage message should be displayed
And exit code should be 1
```

**Test**: `test_path_mode_invalid_path()`

#### Scenario: tsconfig_detection (FR-6)

```gherkin
Given a path argument
When determining the tsconfig
Then shared/* paths should use shared/tsconfig.json
And server/* paths should use server/tsconfig.json
And mcp-server/* paths should use mcp-server/tsconfig.json
And domain-contracts/* paths should use domain-contracts/tsconfig.json
And src/* or no prefix should use ./tsconfig.json
```

**Test**: `test_tsconfig_detection()`

---

### Feature: Filtering and Thresholds

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-3, FR-4

#### Scenario: default_shows_yellow_red_only (FR-3)

```gherkin
Given files with various complexity metrics
When running scripts/metrics/run.sh
Then only files with at least one metric in yellow/red zone should be shown
And files with all green metrics should be filtered out
```

**Test**: `test_default_shows_yellow_red_only()`

#### Scenario: all_flag_disables_filtering (FR-4)

```gherkin
Given files with various complexity metrics
When running scripts/metrics/run.sh --all
Then all files should be shown regardless of thresholds
```

**Test**: `test_all_flag_disables_filtering()`

#### Scenario: mixed_severity_shown (FR-3)

```gherkin
Given a file with one metric in yellow zone and others in green
When running scripts/metrics/run.sh
Then the file should be shown in output
```

**Test**: `test_mixed_severity_shown()`

---

### Feature: Output Formats

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-5, FR-7

#### Scenario: default_text_table_output (FR-7)

```gherkin
Given metrics data is available
When running scripts/metrics/run.sh without format flags
Then output should be a human-readable text table
With columns: FILE, MI, CC, CoC, Status
```

**Test**: `test_default_text_table_output()`

#### Scenario: json_flag_outputs_json (FR-5)

```gherkin
Given metrics data is available
When running scripts/metrics/run.sh --json
Then output should be valid JSON
With structure: { "metrics": [{ "filePath": "...", "maintainabilityIndex": N, ... }]}
```

**Test**: `test_json_flag_outputs_json()`

#### Scenario: json_with_all_flag (FR-5)

```gherkin
Given metrics data is available
When running scripts/metrics/run.sh --json --all
Then all files should be included in JSON output
```

**Test**: `test_json_with_all_flag()`

#### Scenario: ansi_color_codes (NFR-U3)

```gherkin
Given text table output mode
When displaying the Status column
Then ANSI color codes should be used
RED files should have red color
YLW files should have yellow color
GRN files should have green color
```

**Test**: `test_ansi_color_codes()`

---

### Feature: Error Handling

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: NFR-R1, NFR-R2, NFR-R3

#### Scenario: missing_tsconfig_graceful (NFR-R1)

```gherkin
Given a tsconfig path that does not exist
When running the metrics script
Then the script should continue with other tsconfigs
And a warning should be logged to stderr
```

**Test**: `test_missing_tsconfig_graceful()`

#### Scenario: no_typescript_files (NFR-R3)

```gherkin
Given a directory or git state with no .ts files
When running the metrics script
Then empty table/array should be output
And exit code should be 0
```

**Test**: `test_no_typescript_files()`

#### Scenario: tsg_not_installed (Error)

```gherkin
Given tsg CLI is not installed
When running the metrics script
Then error message "tsg CLI required" should be displayed
And exit code should be 1
```

**Test**: `test_tsg_not_installed()`

---

### Feature: Exit Codes

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: NFR-U2

#### Scenario: exit_code_success (NFR-U2)

```gherkin
Given the script runs successfully
When no errors occur
Then exit code should be 0
```

**Test**: `test_exit_code_success()`

#### Scenario: exit_code_error (NFR-U2)

```gherkin
Given an error condition (invalid path, missing tsg)
When the script encounters the error
Then exit code should be 1
```

**Test**: `test_exit_code_error()`

#### Scenario: exit_code_red_zone (NFR-U2)

```gherkin
Given metrics analysis completes
When at least one file is in red zone
Then exit code should be 2
```

**Test**: `test_exit_code_red_zone()`

---

### Feature: Configuration Override

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: FR-8

#### Scenario: custom_confrc_overrides_defaults (FR-8)

```gherkin
Given a .confrc file with custom thresholds
When running the metrics script
Then custom values should be used instead of defaults
```

**Test**: `test_custom_confrc_overrides_defaults()`

#### Scenario: invalid_confrc_syntax (FR-8)

```gherkin
Given a .confrc file with invalid syntax
When running the metrics script
Then a clear error message should be displayed
```

**Test**: `test_invalid_confrc_syntax()`

---

### Feature: Help Output

**File**: `scripts/metrics/tests/test_run.sh`
**Covers**: NFR-U1

#### Scenario: help_flag (NFR-U1)

```gherkin
Given the metrics script exists
When running scripts/metrics/run.sh --help
Then usage information should be displayed
Including available flags and syntax
```

**Test**: `test_help_flag()`

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| No TypeScript files changed | Empty table/array, exit 0 | `test_no_typescript_files` | NFR-R3 |
| Invalid path argument | Usage message, exit 1 | `test_path_mode_invalid_path` | NFR-R2 |
| Mixed metric severity | File shown if any metric yellow/red | `test_mixed_severity_shown` | FR-3 |
| Missing tsconfig file | Continue with others, warn stderr | `test_missing_tsconfig_graceful` | NFR-R1 |
| tsg not installed | Error message, exit 1 | `test_tsg_not_installed` | Error |
| Invalid .confrc syntax | Clear error message | `test_invalid_confrc_syntax` | FR-8 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `scripts/metrics/tests/test_run.sh` | 33 | ~400 | RED |

## Verification

Run tests (should all fail):
```bash
./scripts/metrics/tests/test_run.sh
```

Expected: **All tests fail (RED status)**

Current test output:
```
Tests run:    33
Tests passed: 0
Tests failed: 33
Status: RED (implementation pending)
```

## Coverage Checklist

- [x] All functional requirements (FR-1 through FR-10) have test coverage
- [x] All non-functional requirements (NFR-P1, NFR-R1-3, NFR-U1-3) have test coverage
- [x] Error scenarios covered
- [x] Edge cases documented
- [x] Tests verified as RED

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Create run.sh script | `test_script_file_exists`, `test_script_is_executable` |
| Create .confrc.sample | `test_confrc_sample_created`, `test_confrc_default_values` |
| Implement git diff mode | `test_git_diff_mode_*` |
| Implement path mode | `test_path_mode_*`, `test_tsconfig_detection` |
| Implement filtering logic | `test_default_shows_yellow_red_only`, `test_all_flag_disables_filtering`, `test_threshold_filtering` |
| Implement text output | `test_default_text_table_output`, `test_text_table_columns`, `test_ansi_color_codes` |
| Implement JSON output | `test_json_flag_outputs_json`, `test_json_format_structure`, `test_json_with_all_flag` |
| Implement error handling | `test_missing_tsconfig_graceful`, `test_path_mode_invalid_path`, `test_no_typescript_files` |
| Implement exit codes | `test_exit_code_success`, `test_exit_code_error`, `test_exit_code_red_zone` |
| Implement help | `test_help_flag` |

After each task: `./scripts/metrics/tests/test_run.sh` should show fewer failures.
