---
code: MDT-112
status: Implemented
dateCreated: 2025-12-30T22:21:40.445Z
type: Feature Enhancement
priority: Medium
---

# Add code complexity metrics collection script for LLM consumption

## 1. Description

### Requirements Scope

`brief` — Minimal requirements, fix criteria only

### Problem

- LLM agents need automated feedback on code quality during development
- TypeScript-Graph tool produces complexity metrics but no filtering or LLM-friendly output
- Manual inspection of changed files is time-consuming and error-prone

### Affected Areas

- Development workflow: Code quality checks during PR review and refactoring
- Scripts directory: New `scripts/metrics/` subdirectory
- Build tooling: Integration with existing TypeScript-Graph CLI

### Scope

- **In scope**: Shell script wrapper, configuration file, LLM-friendly JSON output format
- **Out of scope**: Actual refactoring of files identified as complex, CI/CD integration

## 2. Desired Outcome

### Success Conditions

- Running `scripts/metrics/run.sh` shows only yellow/red zone complexity metrics for changed TypeScript files
- Running `scripts/metrics/run.sh path/to/dir` shows metrics for specific directory/file
- Output format is structured JSON that LLMs can easily parse and act upon
- Configuration file allows customization of complexity thresholds

### Constraints

- Must use existing TypeScript-Graph CLI (`tsg`) tool
- Must support multiple tsconfig files (root, shared, server, mcp-server, domain-contracts)
- Must filter output by default to show only problematic files (yellow/red zones)
- `--all` flag must override filter to show all metrics

### Non-Goals

- Not replacing existing TypeScript validation scripts
- Not integrating with CI/CD pipelines (deferred to future work)
- Not providing auto-refactoring suggestions

### Pattern

Thin wrapper — Shell script orchestrates existing CLI tool with filtering and formatting.

### CLI Interface

> **Detailed commands**: See [requirements.md - Implementation Commands](./requirements.md#implementation-commands)

**Modes**:

- No arguments: Git diff mode (tracked + untracked .ts files)
- Path argument: Analyze specific directory or file
- `--all`: Show all files, disable threshold filtering
- `--json`: Output raw tsg JSON instead of text table

### Key Dependencies

| Capability   | Package                  | Rationale                                    |
|--------------|--------------------------|----------------------------------------------|
| Code metrics | `tsg` (TypeScript-Graph) | Already installed, produces required metrics |

### Structure

```
scripts/metrics/
  ├── run.sh           → Main script: git diff, tsg invocation, JSON filtering
  ├── .confrc.sample   → Configuration template with documented defaults
  └── README.md        → Usage documentation
```

**Note**: `.confrc` is optional — created by user to override defaults

### Size Guidance

| Module           | Role                      | Limit | Hard Max |
|------------------|---------------------------|-------|----------|
| `run.sh`         | Orchestration + filtering | 250   | 400      |
| `.confrc.sample` | Configuration template    | 45    | 65       |
| `README.md`      | Documentation             | 100   | 200      |

### Threshold Defaults

> **Detailed configuration**:
> See [requirements.md - Configuration Requirements](./MDT-112/requirements.md#configuration-requirements)

Microsoft Industry Standard:

- Maintainability Index: Green ≥41, Yellow 21-40, Red 0-20
- Cyclomatic Complexity: Green ≤10, Yellow 11-20, Red ≥21
- Cognitive Complexity: Green ≤10, Yellow 11-20, Red ≥21

**Filtering**: Show file if ANY metric is in yellow/red zone.

### Output Formats

> **Detailed specifications**: See [requirements.md - Output Specifications](./requirements.md#output-specifications)

- **Default**: Human-readable text table with colored status
- **Optional (`--json`)**: Raw tsg JSON for LLM consumption

### Extension Rule

To add new metric: Add threshold to `.confrc`, update filtering logic in `run.sh` (limit 150 lines total).

## 3. Open Questions

| Area          | Question                                                        | Constraints                                      |
|---------------|-----------------------------------------------------------------|--------------------------------------------------|
| Thresholds    | What are reasonable yellow/red zone boundaries for each metric? | Use industry standards as baseline               |
| Output format | What JSON structure is most LLM-friendly?                       | Must be parseable, include file path and metrics |
| Filtering     | How to handle files with mixed metric severity?                 | Show if any metric is in yellow/red zone         |

### Known Constraints

- Must use `tsg` CLI from TypeScript-Graph project
- Must support git diff-based file discovery
- Must work with monorepo structure (multiple tsconfig files)

### Decisions Deferred

- Exact threshold values (yellow/red zones) — determine based on industry standards
- JSON schema details — defer to implementation

## 4. Acceptance Criteria

### Functional

- [ ] `scripts/metrics/run.sh` exists and is executable
- [ ] `scripts/metrics/.confrc` exists with threshold configuration
- [ ] Running without arguments shows metrics for git-changed TypeScript files only
- [ ] Running with path argument shows metrics for that directory/file
- [ ] Default output shows only files where at least one metric is in yellow/red zone
- [ ] `--all` flag shows all files regardless of metric thresholds
- [ ] Output is valid JSON with
  structure: `{"metrics": [{"filePath": "...", "maintainabilityIndex": N, "cyclomaticComplexity": N, "cognitiveComplexity": N}]}`

### Non-Functional

- [ ] Script completes in < 5 seconds for typical change set (< 20 files)
- [ ] Script handles missing tsconfig files gracefully
- [ ] Configuration file is editable without modifying script

### Edge Cases

- [ ] No TypeScript files changed: Output empty metrics array
- [ ] Invalid path argument: Show usage message
- [ ] Mixed metric severity (one yellow, others green): Show file

> **Requirements Specification**: [requirements.md](./requirements.md) — Detailed functional, non-functional, and
> configuration requirements

## 5. Verification
### How to Verify Success

- **Manual verification**: Run `scripts/metrics/run.sh` after making a TypeScript change, verify output shows JSON with
  changed file metrics
- **Manual verification**: Run `scripts/metrics/run.sh shared/test-lib/ticket`, verify specific directory metrics
- **Manual verification**: Edit `.confrc` thresholds, verify output changes accordingly
- **Manual verification**: Run with `--all` flag, verify all files shown regardless of thresholds
- **Documentation**: CLAUDE.md updated with usage instructions in Development Commands section
- **Documentation**: `scripts/metrics/README.md` created with configuration reference
