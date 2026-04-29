#!/bin/sh
# Block commits with broken markdown code blocks (unclosed/malformed fences)
#
# Two checks:
#   1. Fence parity: odd number of fence markers = unclosed fence
#   2. markdownlint-cli2: style rules (MD031, MD040, MD046, MD048)

check_markdown_fences() {
  STAGED_MD=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.md$' || true)

  if [ -z "$STAGED_MD" ]; then
    return 0
  fi

  violations=0

  # Check 1: Fence parity (unclosed fences)
  # Skip prompts/ — uses nested markdown-in-markdown which confuses parity count
  for file in $STAGED_MD; do
    if [ ! -f "$file" ]; then
      continue
    fi
    case "$file" in
      prompts/*) continue ;;
    esac

    # Count lines starting with 3+ backticks or tildes (fence openers/closers)
    # Use awk to avoid sh arithmetic issues with empty/multiline grep -c output
    fence_count=$(awk '/^```|^~~~/{count++} END{print count+0}' "$file" 2>/dev/null || echo 0)

    if [ "$(expr "$fence_count" % 2)" -ne 0 ]; then
      echo "❌ ERROR: Unclosed code fence in: $file"
      echo "   Found $fence_count fence marker(s) — must be even (open + close)."
      echo "   Fix: add missing closing \`\`\` or remove stray opening \`\`\`"
      echo ""
      grep -nE '^```|^~~~' "$file" | sed 's/^/   /'
      echo ""
      violations=$(expr "$violations" + 1)
    fi
  done

  # Check 2: markdownlint style rules
  if ! ./node_modules/.bin/markdownlint-cli2 $STAGED_MD 2>&1; then
    echo ""
    echo "  Fix guide:"
    echo "    MD031  Add blank line before/after fenced code block"
    echo "    MD040  Add language to fence: \`\`\` → \`\`\`bash / \`\`\`typescript / \`\`\`text"
    echo "    MD046  Use consistent fence style (all backticks or all tildes)"
    echo "    MD048  Use consistent fence character (backtick or tilde, not mixed)"
    echo ""
    echo "  Autofix MD031/MD046/MD048:  markdownlint-cli2 --fix \"**/*.md\""
    violations=$(expr "$violations" + 1)
  fi

  if [ "$violations" -gt 0 ]; then
    echo "❌ Commit blocked: Markdown code fence errors found."
    echo "   Fix the issues above and try again."
    return 1
  fi

  return 0
}
