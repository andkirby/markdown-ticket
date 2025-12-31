# Requirements: MDT-112

**Source**: [MDT-112](../MDT-112-add-code-complexity-metrics-collection-script-for-.md)
**Generated**: 2025-12-30
**CR Type**: Feature Enhancement
**Requirements Scope**: brief

## Bug Description

N/A — This is a feature enhancement.

## Functional Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | Script shall discover tracked (modified) and untracked (new) TypeScript files via git | Enables automatic checking of all work-in-progress code |
| FR-2 | Script shall accept optional path argument pointing to either a directory or a specific `.ts` file | Allows targeted analysis of files or directories |
| FR-3 | Script shall filter output to show only files with metrics in yellow/red zones | Focuses attention on problematic code |
| FR-4 | Script shall support `--all` flag to disable threshold filtering | Allows viewing all metrics |
| FR-5 | Script shall support `--json` flag to output raw tsg JSON | Enables LLM consumption |
| FR-6 | Script shall detect appropriate tsconfig from path argument | Supports monorepo structure |
| FR-7 | Script shall output human-readable text table by default | Provides immediate terminal feedback |
| FR-8 | Script shall source configuration from `.confrc` file | Allows threshold customization |
| FR-9 | Script shall build tsg command with configurable tsconfig list from `.confrc` | Supports project-specific tsconfig paths |
| FR-10 | Script shall create `.confrc.sample` with documented defaults | Provides template for users without enforcing configuration |

## Implementation Commands

### Git Diff File Discovery (Mode 1: No arguments)

**Git command pattern**:
```bash
changed_files=$(echo -e "$(git diff --name-only | grep '' && git ls-files --others --exclude-standard)" | grep -v '/$' | grep '\.ts' | xargs)
```

**Components**:
- `git diff --name-only` — tracked files with modifications
- `git ls-files --others --exclude-standard` — untracked files (respects .gitignore)
- `grep -v '/$'` — removes directory entries
- `grep '\.ts'` — filters to TypeScript files only
- `xargs` — formats as space-separated list for tsg

**tsg command pattern**:
```bash
tsg --tsconfig {all_tsconfigs} --stdout metrics --include ${changed_files} | grep -v '==='
```

### Path-Based Mode (Mode 2: With path argument)

**tsconfig detection**:
```bash
# Path argument: ./shared/test-lib/ticket
# Detected tsconfig: shared
# Result: --tsconfig shared
```

**tsg command pattern**:
```bash
tsg --tsconfig {detected} {path} --exclude excludeFiles dist --exclude excludeFiles node_modules --stdout metrics | grep -v '==='
```

**Note**: Path mode uses single tsconfig, git diff mode uses all tsconfigs.

## Non-Functional Requirements

### Performance
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | Script execution time | < 5 seconds for < 20 files | Acceptable developer workflow delay |

### Reliability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | Missing tsconfig handling | Graceful degradation, continue with other tsconfigs | Monorepo has optional projects |
| NFR-R2 | Invalid path argument | Display usage message and exit 1 | Prevents confusing errors |
| NFR-R3 | No TypeScript files found | Output empty table/array, exit 0 | Valid state (no changes) |

### Usability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-U1 | Help output | `--help` flag displays usage | Standard CLI convention |
| NFR-U2 | Exit codes | 0 = success, 1 = error, 2 = red-zone files found | Enables scripting/integration |
| NFR-U3 | Colored output | ANSI colors for status column in text mode | Visual clarity in terminal |

## Configuration Requirements

| Setting | Description | Default | Valid Range | Rationale |
|---------|-------------|---------|-------------|-----------|
| `TSCONFIGS` | Space-separated list of tsconfig paths for tsg command | `. shared mcp-server server domain-contracts` | Valid paths | Monorepo support |
| `MI_YELLOW_MAX` | Maintainability Index yellow zone upper bound | 40 | 0-100 | Microsoft standard |
| `MI_RED_MAX` | Maintainability Index red zone upper bound | 20 | 0-100 | Microsoft standard |
| `CC_YELLOW_MIN` | Cyclomatic Complexity yellow zone lower bound | 11 | 1+ | Microsoft standard |
| `CC_RED_MIN` | Cyclomatic Complexity red zone lower bound | 21 | 1+ | Microsoft standard |
| `COC_YELLOW_MIN` | Cognitive Complexity yellow zone lower bound | 11 | 1+ | Microsoft standard |
| `COC_RED_MIN` | Cognitive Complexity red zone lower bound | 21 | 1+ | Microsoft standard |

**Configuration file format** (`.confrc.sample`):
```bash
# TypeScript configs (space-separated, in priority order)
# These are passed to tsg as: --tsconfig . --tsconfig shared --tsconfig mcp-server ...
TSCONFIGS=". shared mcp-server server domain-contracts"

# Maintainability Index: higher is better
# Microsoft standard: Green ≥41, Yellow 21-40, Red 0-20
MI_YELLOW_MAX=40
MI_RED_MAX=20

# Cyclomatic Complexity: lower is better
# Microsoft standard: Green ≤10, Yellow 11-20, Red ≥21
CC_YELLOW_MIN=11
CC_RED_MIN=21

# Cognitive Complexity: lower is better
# Microsoft standard: Green ≤10, Yellow 11-20, Red ≥21
COC_YELLOW_MIN=11
COC_RED_MIN=21
```

**Configuration behavior**:
- `.confrc.sample` — Created by script, contains documented defaults
- `.confrc` — Optional, user-created (overrides defaults if exists)
- Script sources `.confrc` if present, otherwise uses built-in defaults

**Building tsg command from TSCONFIGS**:
```bash
# Build --tsconfig flags
TSFLAGS=""
for tsconfig in $TSCONFIGS; do
  TSFLAGS="$TSFLAGS --tsconfig $tsconfig"
done

# Result: --tsconfig . --tsconfig shared --tsconfig mcp-server --tsconfig server --tsconfig domain-contracts
```

## Output Specifications

### Default: Text Table Format

```
FILE                                                    MI     CC    CoC   Status
shared/test-lib/ticket/file-ticket-creator.ts        22.77    33     54    RED
shared/test-lib/ticket/ticket-creator.ts             40.88    12     12    YLW
```

**Columns**:
- FILE: File path (truncated if > 55 chars)
- MI: Maintainability Index (0-100, higher = better)
- CC: Cyclomatic Complexity (count, lower = better)
- CoC: Cognitive Complexity (count, lower = better)
- Status: RED | YLW | GRN (color-coded with ANSI)

**Status determination**:
- RED if ANY metric in red zone
- YLW if ANY metric in yellow zone (and none in red)
- GRN if ALL metrics in green zone

### Optional: JSON Format (`--json` flag)

Standard `tsg` JSON output, pass-through with filtering applied:
```json
{
  "metrics": [
    {
      "filePath": "shared/test-lib/ticket/file-ticket-creator.ts",
      "maintainabilityIndex": 22.77,
      "cyclomaticComplexity": 33,
      "cognitiveComplexity": 54
    }
  ]
}
```

**Filtering**: Files not meeting threshold criteria are removed from array (unless `--all` used).

## Error Handling

| Scenario | Detection | Response | Exit Code |
|----------|-----------|----------|-----------|
| Invalid flag | Unknown argument in `$@` | Display usage, error to stderr | 1 |
| Path not found | `test -d` and `test -f` both fail | Display error message | 1 |
| tsg not installed | `command -v tsg` fails | Display error: "tsg CLI required" | 1 |
| tsconfig missing | `tsconfig.json` not found in detected dir | Skip project, log warning to stderr | 0 |
| No .ts files changed | Git diff returns no matches | Output empty table/array | 0 |

## Path → tsconfig Detection Logic

| Path Prefix | Detected tsconfig | tsg Command |
|-------------|-------------------|-------------|
| `shared/...` | `shared/tsconfig.json` | `--tsconfig shared` |
| `server/...` | `server/tsconfig.json` | `--tsconfig server` |
| `mcp-server/...` | `mcp-server/tsconfig.json` | `--tsconfig mcp-server` |
| `domain-contracts/...` | `domain-contracts/tsconfig.json` | `--tsconfig domain-contracts` |
| `src/...` or no prefix | `./tsconfig.json` | `--tsconfig .` |
| Specific `.ts` file path | Extract directory from file path, lookup above | `--tsconfig {detected}` {file} |

**Fallback**: If detected tsconfig file doesn't exist, skip with warning.

## Verification

### Functional Tests
- [ ] No args: Runs git diff mode, shows only yellow/red files
- [ ] Directory path arg: Analyzes all `.ts` files in directory with correct tsconfig
- [ ] File path arg: Analyzes only the specified `.ts` file with correct tsconfig
- [ ] `--all`: Shows all files regardless of thresholds
- [ ] `--json`: Outputs valid JSON, no text table
- [ ] `--json --all`: Outputs all files in JSON
- [ ] No changes: Outputs empty table/array, exits 0
- [ ] Invalid path: Shows usage, exits 1

### Configuration Tests
- [ ] Default `.confrc` values match Microsoft standards
- [ ] Modified `.confrc` thresholds affect filtering
- [ ] Invalid `.confrc` syntax shows clear error

### Output Format Tests
- [ ] Text table has correct columns and alignment
- [ ] Status column uses ANSI colors
- [ ] JSON output validates against tsg schema
- [ ] Long file paths truncated correctly

---
*Generated from MDT-112 by /mdt:requirements (v2)*
