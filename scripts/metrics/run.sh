#!/usr/bin/env bash
# MDT-112: TypeScript Metrics Collection Script
# Complexity analyzer wrapper for TypeStatoscope (tsg)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFRC="$SCRIPT_DIR/.confrc"
CONFRC_SAMPLE="$SCRIPT_DIR/.confrc.sample"

# Default values (may be overridden by .confrc)
SHOW_ALL=false
OUTPUT_JSON=false
EXIT_CODE=0

# ANSI color codes (using printf to generate ESC)
RED=$(printf '\033[31m')
YELLOW=$(printf '\033[33m')
GREEN=$(printf '\033[32m')
RESET=$(printf '\033[0m')

# Help function
show_help() {
  cat << 'EOF'
Usage: run.sh [OPTIONS] [PATH...]

TypeScript code metrics analyzer using TypeStatoscope (tsg).

Arguments:
  PATH        Path(s) to analyze. Can be:
              - Absolute path
              - Relative path from project root
              - TypeScript file (.ts)
              - Directory containing .ts files
              If omitted, defaults to git diff mode (changed files only).

Options:
  --help      Show this help message and exit
  --all       Show all files (disable yellow/red filtering)
  --json      Output metrics as JSON instead of text table

Configuration:
  Thresholds and tsconfig paths are read from .confrc in the same directory.
  Copy .confrc.sample to .confrc and customize as needed.

  Configurable thresholds:
    - MI_YELLOW_MAX, MI_RED_MAX: Maintainability Index bounds
    - CC_YELLOW_MIN, CC_RED_MIN: Cyclomatic Complexity bounds
    - COC_YELLOW_MIN, COC_RED_MIN: Cognitive Complexity bounds

Exit codes:
  0  Success (no red-zone files found)
  1  Error (invalid arguments, missing dependencies)
  2  Red-zone files detected (for CI/CD gating)

Examples:
  run.sh                                    # Git diff mode
  run.sh shared/test-lib/ticket            # Analyze directory
  run.sh shared/test-lib/ticket/*.ts       # Analyze specific files
  run.sh --all shared/src                  # Show all files
  run.sh --json shared/src                 # JSON output

EOF
}

# Check if tsg is installed
check_tsg_installed() {
  if ! command -v tsg &> /dev/null; then
    echo "Error: tsg CLI is required but not installed." >&2
    echo "Install it with: npm install -g typescript-graph" >&2
    exit 1
  fi
}

# Load configuration - sourced from .confrc if exists, else .confrc.sample, else built-in defaults
load_config() {
  if [ -f "$CONFRC" ]; then
    source "$CONFRC"
  elif [ -f "$CONFRC_SAMPLE" ]; then
    source "$CONFRC_SAMPLE"
  else
    # Fallback to built-in defaults (must match .confrc.sample)
    TSCONFIGS=("." "shared" "server" "mcp-server" "domain-contracts")
    MI_YELLOW_MAX=40
    MI_RED_MAX=20
    CC_YELLOW_MIN=11
    CC_RED_MIN=21
    COC_YELLOW_MIN=11
    COC_RED_MIN=21
  fi

  # Validate required variables
  local missing_vars=()
  if [ -z "${MI_YELLOW_MAX:-}" ] || [ -z "${MI_RED_MAX:-}" ]; then
    missing_vars+=("MI_*")
  fi
  if [ -z "${CC_YELLOW_MIN:-}" ] || [ -z "${CC_RED_MIN:-}" ]; then
    missing_vars+=("CC_*")
  fi
  if [ -z "${COC_YELLOW_MIN:-}" ] || [ -z "${COC_RED_MIN:-}" ]; then
    missing_vars+=("COC_*")
  fi

  if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "Error: Invalid .confrc syntax. Missing variables: ${missing_vars[*]}" >&2
    exit 1
  fi
}

# Parse flags
FLAGS=()
PATHS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      show_help
      exit 0
      ;;
    --all)
      SHOW_ALL=true
      shift
      ;;
    --json)
      OUTPUT_JSON=true
      shift
      ;;
    -*)
      echo "Error: Unknown flag: $1" >&2
      echo "Run 'run.sh --help' for usage." >&2
      exit 1
      ;;
    *)
      PATHS+=("$1")
      shift
      ;;
  esac
done

# Initialize
check_tsg_installed
load_config

# Detect tsconfig from path
detect_tsconfig() {
  local path="$1"

  # Convert to absolute path
  if [[ ! "$path" = /* ]]; then
    path="$PROJECT_ROOT/$path"
  fi

  # Check if path exists
  if [ ! -e "$path" ]; then
    echo "Error: Path does not exist: $1" >&2
    exit 1
  fi

  # Detect tsconfig based on path prefix
  if [[ "$path" =~ shared/ ]]; then
    echo "shared/tsconfig.json"
  elif [[ "$path" =~ server/ && ! "$path" =~ mcp-server ]]; then
    echo "server/tsconfig.json"
  elif [[ "$path" =~ mcp-server/ ]]; then
    echo "mcp-server/tsconfig.json"
  elif [[ "$path" =~ domain-contracts/ ]]; then
    echo "domain-contracts/tsconfig.json"
  else
    echo "tsconfig.json"
  fi
}

# Build tsg command
build_tsg_command() {
  local cmd="tsg"

  # Add tsconfigs
  for tsconfig in "${TSCONFIGS[@]}"; do
    cmd="$cmd --tsconfig $tsconfig"
  done

  # Add paths if provided
  if [ ${#PATHS[@]} -gt 0 ]; then
    for path in "${PATHS[@]}";  do
      cmd="$cmd $path"
    done
  fi

  echo "$cmd"
}

# Discover changed files via git
discover_changed_files() {
  local changed_files=()

  # Get tracked changed files
  while IFS= read -r file; do
    changed_files+=("$file")
  done < <(git diff --name-only 2>/dev/null | grep '\.ts$' || true)

  # Get untracked files
  while IFS= read -r file; do
    changed_files+=("$file")
  done < <(git ls-files --others --exclude-standard 2>/dev/null | grep '\.ts$' || true)

  echo "${changed_files[@]}"
}

# Calculate status for a file
calculate_status() {
  local mi="$1"
  local cc="$2"
  local coc="$3"

  # Check if any metric is in red zone
  if (( $(echo "$mi <= $MI_RED_MAX" | bc -l) )) || \
     [ "$cc" -ge "$CC_RED_MIN" ] || \
     [ "$coc" -ge "$COC_RED_MIN" ]; then
    echo "RED"
  # Check if any metric is in yellow zone
  elif (( $(echo "$mi <= $MI_YELLOW_MAX" | bc -l) )) || \
       [ "$cc" -ge "$CC_YELLOW_MIN" ] || \
       [ "$coc" -ge "$COC_YELLOW_MIN" ]; then
    echo "YLW"
  else
    echo "GRN"
  fi
}

# Get color code for individual MI value
get_mi_color() {
  local mi="$1"
  if (( $(echo "$mi <= $MI_RED_MAX" | bc -l) )); then
    echo "$RED"
  elif (( $(echo "$mi <= $MI_YELLOW_MAX" | bc -l) )); then
    echo "$YELLOW"
  else
    echo ""
  fi
}

# Get color code for individual CC value
get_cc_color() {
  local cc="$1"
  if [ "$cc" -ge "$CC_RED_MIN" ]; then
    echo "$RED"
  elif [ "$cc" -ge "$CC_YELLOW_MIN" ]; then
    echo "$YELLOW"
  else
    echo ""
  fi
}

# Get color code for individual CoC value
get_coc_color() {
  local coc="$1"
  if [ "$coc" -ge "$COC_RED_MIN" ]; then
    echo "$RED"
  elif [ "$coc" -ge "$COC_YELLOW_MIN" ]; then
    echo "$YELLOW"
  else
    echo ""
  fi
}

# Check if file should be shown based on filtering
should_show_file() {
  local status="$1"

  if [ "$SHOW_ALL" = true ]; then
    return 0  # Show all files
  fi

  # Show only yellow/red files
  if [ "$status" != "GRN" ]; then
    return 0  # Show file
  fi

  return 1  # Hide file
}

# Run tsg and get metrics
run_tsg_metrics() {
  local cmd="$1"
  local output

  output=$(eval $cmd 2>&1 | grep -v "^===")

  # Check for missing tsconfig files
  if echo "$output" | grep -q "Cannot find tsconfig"; then
    missing=$(echo "$output" | grep "Cannot find tsconfig" | sed 's/.*Cannot find tsconfig //' | sed 's/ at.*//' | sort -u)
    for tsconfig in $missing; do
      echo "Warning: tsconfig not found: $tsconfig" >&2
    done
    # Continue with available tsconfigs
    output=$($cmd 2>/dev/null || echo '{"metrics":[]}')
  fi

  echo "$output"
}

# Format output as text table
format_text_table() {
  local json="$1"

  # Check if there are any metrics using jq
  local metric_count
  metric_count=$(echo "$json" | jq -r '.metrics | length' 2>/dev/null || echo "0")

  if [ "$metric_count" -eq 0 ]; then
    echo "No metrics found."
    return
  fi

  # Print header
  printf "%-55s %8s %6s %6s %8s\n" "FILE" "MI" "CC" "CoC" "Status"
  printf "%-55s %8s %6s %6s %8s\n" "----" "--" "--" "---" "------"

  # Process each file using jq
  local i=0
  while [ $i -lt $metric_count ]; do
    local file=$(echo "$json" | jq -r ".metrics[$i].filePath")
    local mi=$(echo "$json" | jq -r ".metrics[$i].maintainabilityIndex")
    local cc=$(echo "$json" | jq -r ".metrics[$i].cyclomaticComplexity")
    local coc=$(echo "$json" | jq -r ".metrics[$i].cognitiveComplexity")

    # Calculate status
    local status
    status=$(calculate_status "$mi" "$cc" "$coc")

    # Check if should show
    if should_show_file "$status"; then
      # Get color for each metric
      local mi_color=$(get_mi_color "$mi")
      local cc_color=$(get_cc_color "$cc")
      local coc_color=$(get_coc_color "$coc")
      local status_color=""
      case "$status" in
        RED) status_color="$RED" ;;
        YLW) status_color="$YELLOW" ;;
        GRN) status_color="$GREEN" ;;
      esac

      # Truncate file path if needed
      local display_file="$file"
      if [ ${#file} -gt 55 ]; then
        display_file="...${file: -52}"
      fi

      # Print with colored values
      printf "%-55s ${mi_color}%8s${RESET} ${cc_color}%6s${RESET} ${coc_color}%6s${RESET} ${status_color}%s${RESET}\n" \
        "$display_file" "$mi" "$cc" "$coc" "$status"

      # Track red zone for exit code
      if [ "$status" = "RED" ]; then
        EXIT_CODE=2
      fi
    fi

    i=$((i + 1))
  done
}

# Main execution
main() {
  local tsg_cmd
  local tsg_output

  # Build tsg command
  if [ ${#PATHS[@]} -eq 0 ]; then
    # Git diff mode
    local changed
    changed=$(discover_changed_files)

    if [ -z "$changed" ]; then
      # No changed files
      if [ "$OUTPUT_JSON" = true ]; then
        echo '{"metrics":[]}'
      else
        echo "No TypeScript files changed."
      fi
      exit 0
    fi

    # Filter to .ts files only
    local ts_files=()
    for file in $changed; do
      if [[ "$file" =~ \.ts$ ]]; then
        ts_files+=("$file")
      fi
    done

    if [ ${#ts_files[@]} -eq 0 ]; then
      if [ "$OUTPUT_JSON" = true ]; then
        echo '{"metrics":[]}'
      else
        echo "No TypeScript files changed."
      fi
      exit 0
    fi

    # Git diff mode: Run tsg ONCE with all tsconfigs and changed files
    # Build file list
    local file_list=""
    for file in "${ts_files[@]}"; do
      file_list="$file_list $file"
    done

    # Run tsg once with all tsconfigs (fast - single invocation)
    tsg_cmd="tsg"
    for tsconfig in "${TSCONFIGS[@]}"; do
      tsg_cmd="$tsg_cmd --tsconfig $tsconfig"
    done
    tsg_cmd="$tsg_cmd --stdout metrics --include $file_list"

    tsg_output=$(run_tsg_metrics "$tsg_cmd")
  else
    # Path mode
    local first_tsconfig
    first_tsconfig=$(detect_tsconfig "${PATHS[0]}")
    # Convert tsconfig.json path to directory
    local tsconfig_dir
    tsconfig_dir=$(dirname "$first_tsconfig")

    # Build file list for --include (using full paths)
    local include_files=""
    for path in "${PATHS[@]}"; do
      include_files="$include_files $path"
    done

    tsg_cmd="tsg --tsconfig $tsconfig_dir --stdout metrics --include $include_files"
    tsg_cmd="$tsg_cmd --exclude excludeFiles dist node_modules '**/*.test.ts' '**/*.spec.ts'"

    # Run tsg for path mode only (git diff mode already set tsg_output)
    tsg_output=$(run_tsg_metrics "$tsg_cmd")
  fi

  # Output
  if [ "$OUTPUT_JSON" = true ]; then
    # Filter JSON based on thresholds (unless --all)
    if [ "$SHOW_ALL" = false ]; then
      echo "$tsg_output" | jq -r '
        .metrics | map(
          select(
            .maintainabilityIndex <= '$MI_YELLOW_MAX' or
            .cyclomaticComplexity >= '$CC_YELLOW_MIN' or
            .cognitiveComplexity >= '$COC_YELLOW_MIN'
          )
        ) | {metrics: .}
      ' | jq '.'

      # Check for red zone
      local has_red
      has_red=$(echo "$tsg_output" | jq -r '
        .metrics | map(
          select(
            .maintainabilityIndex <= '$MI_RED_MAX' or
            .cyclomaticComplexity >= '$CC_RED_MIN' or
            .cognitiveComplexity >= '$COC_RED_MIN'
          )
        ) | length
      ')

      if [ "$has_red" -gt 0 ]; then
        EXIT_CODE=2
      fi
    else
      echo "$tsg_output"
    fi
  else
    format_text_table "$tsg_output"
  fi

  exit $EXIT_CODE
}

# Run main
main
