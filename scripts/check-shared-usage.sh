#!/bin/bash
# Check dead code in shared/ using scip-finder

echo "=== Shared Models ==="
for f in Config Project Ticket Types; do
  if [ ! -f "shared/models/${f}.ts" ]; then
    printf "%-25s %5s\n" "$f" "(removed)"
    continue
  fi
  count=$(scip-finder --from shared/models/${f}.ts $(basename $f .ts) 2>/dev/null | grep -v "shared/models/${f}.ts" | wc -l | tr -d ' ')
  status="✅"
  if [ "$count" -eq 1 ]; then
    status="⚠️  minimal"
  fi
  printf "%-25s %5d usages %s\n" "$f" "$count" "$status"
done

echo ""
echo "=== Shared Services ==="
for f in CRService MarkdownSectionService MarkdownService ProjectService TemplateService TicketService TitleExtractionService; do
  if [ ! -f "shared/services/${f}.ts" ]; then
    printf "%-30s %5s\n" "$f" "(removed)"
    continue
  fi
  count=$(scip-finder --from shared/services/${f}.ts $(basename $f .ts) 2>/dev/null | grep -v "shared/services/${f}.ts" | wc -l | tr -d ' ')
  status="✅"
  if [ "$count" -eq 0 ]; then
    status="❌ DEAD"
  elif [ "$count" -lt 5 ]; then
    status="⚠️  minimal"
  fi
  printf "%-30s %5d usages %s\n" "$f" "$count" "$status"
done
