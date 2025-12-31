# TypeScript Metrics Collection

A shell script wrapper for [TypeScript-Graph](https://github.com/TypeScript-Graph/TypeStatoscope) (tsg) that provides code complexity analysis with configurable thresholds and LLM-friendly output.

## Overview

This script analyzes TypeScript code for three complexity metrics:
- **Maintainability Index (MI)**: Ranges from 0-100, higher is better
- **Cyclomatic Complexity (CC)**: Measures control flow complexity
- **Cognitive Complexity (CoC)**: Measures mental effort to understand code

By default, only files with metrics in yellow or red zones are shown, helping you focus on code that needs attention.

## Installation

1. Ensure `tsg` CLI is installed:
   ```bash
   npm install -g typescript-graph
   ```

2. The script and configuration are located in:
   ```
   scripts/metrics/
   ├── run.sh              # Main script
   ├── .confrc.sample      # Configuration template
   └── README.md           # This file
   ```

## Usage

### Basic Commands

```bash
# Analyze only changed TypeScript files (git diff mode)
./scripts/metrics/run.sh

# Analyze a specific directory
./scripts/metrics/run.sh shared/test-lib/ticket

# Analyze a specific file
./scripts/metrics/run.sh shared/test-lib/ticket/ticket-creator.ts

# Show all files (disable yellow/red filtering)
./scripts/metrics/run.sh --all shared/src

# Output as JSON for LLM consumption
./scripts/metrics/run.sh --json shared/test-lib
```

### Flags

| Flag | Description |
|------|-------------|
| `--help` | Show usage information |
| `--all` | Show all files regardless of thresholds |
| `--json` | Output metrics as JSON instead of text table |

## Configuration

### Threshold Configuration

The script uses Microsoft standard thresholds for code complexity:

#### Maintainability Index (MI)
| Zone | Range | Description |
|------|-------|-------------|
| Green | ≥ 41 | Well-maintained |
| Yellow | 21-40 | Moderate concerns |
| Red | 0-20 | Significant issues |

#### Cyclomatic Complexity (CC)
| Zone | Range | Description |
|------|-------|-------------|
| Green | ≤ 10 | Simple control flow |
| Yellow | 11-20 | Moderately complex |
| Red | ≥ 21 | Highly complex |

#### Cognitive Complexity (CoC)
| Zone | Range | Description |
|------|-------|-------------|
| Green | ≤ 10 | Easy to understand |
| Yellow | 11-20 | Moderate effort |
| Red | ≥ 21 | Difficult to understand |

### Customizing Thresholds

1. Copy the sample configuration:
   ```bash
   cp scripts/metrics/.confrc.sample scripts/metrics/.confrc
   ```

2. Edit `.confrc` to customize thresholds:
   ```bash
   # Example: Make yellow zone more strict
   MI_YELLOW_MAX=35
   CC_YELLOW_MIN=8
   COC_YELLOW_MIN=8
   ```

### TypeScript Configuration

The script automatically detects which `tsconfig.json` to use based on the path:

| Path Pattern | tsconfig Used |
|--------------|---------------|
| `shared/*` | `shared/tsconfig.json` |
| `server/*` | `server/tsconfig.json` |
| `mcp-server/*` | `mcp-server/tsconfig.json` |
| `domain-contracts/*` | `domain-contracts/tsconfig.json` |
| `src/*` or root | `tsconfig.json` |

In git diff mode (no arguments), all 5 tsconfigs are used.

## Output Formats

### Text Table (Default)

Human-readable output with colored status:

```
FILE                                                     MI      CC    CoC   Status
-----------------------------------------------------  -------  -----  -----  --------
shared/test-lib/ticket/file-ticket-creator.ts          22.77    33     54    RED
shared/test-lib/ticket/ticket-creator.ts               40.88    12     12    YLW
```

### JSON Format

LLM-friendly JSON output:

```bash
./scripts/metrics/run.sh --json shared/test-lib
```

Output:
```json
{
  "metrics": [
    {
      "filePath": "shared/test-lib/ticket/file-ticket-creator.ts",
      "maintainabilityIndex": 22.77,
      "cyclomaticComplexity": 33,
      "cognitiveComplexity": 54
    },
    {
      "filePath": "shared/test-lib/ticket/ticket-creator.ts",
      "maintainabilityIndex": 40.88,
      "cyclomaticComplexity": 12,
      "cognitiveComplexity": 12
    }
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (no red-zone files) |
| 1 | Error (invalid arguments, missing tsg) |
| 2 | Red-zone files detected |

Exit code 2 is useful for CI/CD gating:

```bash
#!/bin/bash
./scripts/metrics/run.sh --json
if [ $? -eq 2 ]; then
  echo "Red-zone files detected! Failing build."
  exit 1
fi
```

## Examples

### LLM Integration

Feed metrics directly to an LLM for code review:

```bash
./scripts/metrics/run.sh --json | \
  jq -r '.metrics[] | "\(.filePath): MI=\(.maintainabilityIndex), CC=\(.cyclomaticComplexity)"' | \
  llm review
```

### PR Review Workflow

Check complexity of changed files before creating a PR:

```bash
echo "Checking complexity of changed files..."
./scripts/metrics/run.sh

if [ $? -eq 2 ]; then
  echo ""
  echo "Warning: Some files are in the red zone."
  echo "Consider refactoring before creating a PR."
fi
```

### Find Most Complex Files

Show all files sorted by maintainability index:

```bash
./scripts/metrics/run.sh --all --json | \
  jq -r '.metrics | sort_by(.maintainabilityIndex) | .[] | "\(.filePath): \(.maintainabilityIndex)"'
```

## Error Handling

- **Missing tsconfig**: Script continues with available tsconfigs, logs warning to stderr
- **No TypeScript files**: Outputs empty table/array, exits with code 0
- **Invalid path**: Shows error message, exits with code 1
- **tsg not installed**: Shows installation instructions, exits with code 1

## Integration with Claude Code

The script is already integrated into the development workflow:

```bash
# Add to your pre-commit hook
./scripts/metrics/run.sh || echo "Warning: High complexity files detected"
```

See `CLAUDE.md` in the project root for the full development command reference.
