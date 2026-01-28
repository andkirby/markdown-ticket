# MDT Task Breakdown Workflow (v8)

Generate tasks from architecture + tests. Tasks include **constraints** (limits, exclusions, anti-duplication), not just actions.

## Decision Tree

```
Input: /mdt:tasks {CR-KEY} [--prep] [--part X.Y]

Prerequisites exist?
├─ No architecture.md → ERROR: Run /mdt:architecture first
├─ No tests.md → ERROR: Run /mdt:tests first
│
└─ Yes → What mode?
    ├─ --prep → Read prep/architecture.md + prep/tests.md
    │   └─ Output: prep/tasks.md
    │
    └─ Feature → Read architecture.md + [part-X.Y/]tests.md
        ├─ Multi-part? Prompt for part selection
        └─ Output: [part-X.Y/]tasks.md
```

## Task Template (Essential)

```markdown
### Task {N}: {Brief description}

**Structure**: `{path from architecture}`

**Makes GREEN**: *(from tests.md)*
- `test_file.ts`: `test name`

**Limits**: {N} lines (hard max: {N×1.5})

**Create/Move**:
- {specific item 1}
- {specific item 2}

**Exclude**: {what NOT to include}

**Anti-duplication**: Import `{X}` from `{path}` — do NOT copy

**Verify**:
```bash
wc -l {file}                    # ≤ limit
{test_command} --filter="..."   # tests GREEN
```

**Done when**:
- [ ] Tests GREEN (were RED)
- [ ] Size ≤ limit
- [ ] No duplicated logic
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements (if applicable)
```

## Critical Rules

1. **Limits inherited** from architecture.md size guidance
2. **Makes GREEN** populated from tests.md
3. **Exclude** explicitly states what NOT to move
4. **Anti-duplication** requires import, never copy
5. **Order**: Shared utilities before features

## Output: tasks.md

```markdown
# Tasks: {CR-KEY}

**Source**: architecture.md + tests.md

## Size Thresholds

| Module | Limit | Hard Max |
|--------|-------|----------|
| `file.ts` | 100 | 150 |

## Tasks

### Task 1: ...
### Task 2: ...

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Size compliance (wc -l check)
- [ ] All tests GREEN
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback/absence paths match requirements (if applicable)

## Post-Verify Fixes (appended by implement-agentic)

- Added only if `/mdt:verify-complete` finds CRITICAL/HIGH issues
- Each fix references issue evidence and required action
```

## Common Pitfall

❌ **Don't** write tasks as just "implement X"
✅ **Do** include Limits, Exclude, Anti-duplication for every task

## Checklist

- [ ] Architecture + tests exist
- [ ] Size limits from architecture
- [ ] Makes GREEN from tests.md
- [ ] Every task has Limits, Exclude, Anti-duplication
- [ ] Shared patterns before features

## Integration

```
/mdt:architecture → structure + size limits
        ↓
/mdt:tests → test specs
        ↓
/mdt:tasks → tasks with constraints (this workflow)
        ↓
/mdt:implement → makes tests GREEN
```

---
*Context: $ARGUMENTS*
