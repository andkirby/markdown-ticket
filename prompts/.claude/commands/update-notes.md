---
description: Update CHANGE_NOTES.md and commit changes to prompts folder
argument-hint: [--dry-run] [--no-commit] [--skip-version]
---

# Update Notes and Commit Changes

This command helps you update CHANGE_NOTES.md with changes made to mdt-*.md files and commit them with proper messages.

## Options
- `--dry-run`: Show what would be done without making changes
- `--no-commit`: Update files but don't commit
- `--skip-version`: Skip version increment step

## Process

### 1. Analyze current changes

!git diff --name-only *.md

### 2. Read current CHANGE_NOTES.md

!cat CHANGE_NOTES.md

### 3. Analyze what changed

!git diff .

### 3.5. Check for renamed/moved files

**IMPORTANT**: When files are renamed or moved, `git diff` does not show changes by default. Use the `-M` flag to detect renames and show diffs properly:

```bash
# Show diff for a specific renamed file (before and after paths)
git diff --cached -M --unified=1 -- old/path.md new/path.md

# Show all renames with statistics
git diff --cached -M --stat

# Show rename detection for unstaged changes
git diff -M --unified=1 -- old/path.md new/path.md
```

This is critical when analyzing changes to reorganized workflows (e.g., `commands/mdt-tasks.md` → `mdt/commands/tasks.md`). Without `-M`, git treats these as delete+create pairs and you lose the diff context.

### 4. Determine if this is a new workflow or an update

Check if any mdt-*.md files are new or modified:

```bash
# List new mdt-*.md files
git status --porcelain *.md | grep "^??" | grep "mdt-.*\.md"

# List modified mdt-*.md files
git status --porcelain *.md | grep "^ M" | grep "mdt-.*\.md"
```

### 5. Version Increment FIRST (unless --skip-version)

**IMPORTANT**: Ask for version increment BEFORE writing CHANGE_NOTES.md so the entry contains the correct final version.

**Read current plugin version:**

!cat mdt/.claude-plugin/plugin.json | jq '.version'

**Analyze changes and recommend version increment type:**

Based on the changes detected, recommend the appropriate version increment:

| Change Type | Recommendation | Example |
|-------------|----------------|---------|
| New command/workflow added | `beta` or `minor` | 0.10.0 → 0.11.0-beta |
| Breaking changes to existing workflow | `beta` or `minor` | 0.10.0 → 0.11.0-beta |
| Bug fixes, small improvements | `patch` | 0.10.0 → 0.10.1 |
| Beta iteration | `beta` | 0.11.0-beta → 0.11.0-beta.1 |
| Release stable from pre-release | `release` | 0.11.0-beta.22 → 0.11.0 |

**Ask user for version increment action:**

Present options based on current version state and analysis:

- `beta`: Smart beta increment (handles all beta transitions)
  - From stable: 0.10.0 → 0.11.0-beta
  - From beta without number: 0.11.0-beta → 0.11.0-beta.1
  - From beta with number: 0.11.0-beta.1 → 0.11.0-beta.2
- `release`: Release stable from pre-release (removes any suffix like -beta.22, -rc.5, etc.)
- `minor`: Increment minor version (e.g., 0.10.0 → 0.11.0)
- `patch`: Increment patch version (e.g., 0.10.0 → 0.10.1)
- `skip`: Don't update version

**Execute version update:**

```bash
./scripts/mdt-version-increment.sh <action>
```

**Record the version change for CHANGE_NOTES.md:**
- Old version: {from step above}
- New version: {from script output}
- Use format: `plugin.json (OLD → NEW)` in the notes

### 6. Update CHANGE_NOTES.md

Add a new entry at the top (after "Recent Updates" header) following this format:

```markdown
### YYYY-MM-DD - [Concise Problem/Solution Title]

**Problem**: [What problem does this change solve?]

**Solution**: [How does this change solve the problem?]

**Changes Made**:

1. **[filename.md (vX→vY) - Brief description]**:
   - Key changes in bullet points
   - Important details about functionality
   - Version changes

2. **[filename.md (vX→vY) - Brief description]**:
   - Key changes in bullet points
   - Integration details with other workflows
   - Output format changes

**Impact**:
- [What value does this provide?]
- [How does it improve the workflow?]
- [What problems does it prevent?]

**Files Changed**:
- `prompts/[filename.md]`
- `prompts/[other-filename.md]`
- `prompts/mdt/.claude-plugin/plugin.json` (OLD → NEW)  ← use actual version from step 5
```

### 7. Version Requirements

- All modified mdt-*.md files MUST have incremented versions
- Check that README.md reflects updated versions
- Example: (v4→v5), (v1), (new)

### 8. Update install-claude.sh for NEW commands

If a NEW mdt-*.md file was added:
1. Add the command name to MDT_COMMANDS array (alphabetical order)
2. Update show_usage function with the command description
3. Update workflow chain if needed

### 9. Stage and commit changes (unless --no-commit)

!git add *.md install-claude.sh mdt/.claude-plugin/plugin.json

!git commit -m "$(cat <<'EOF'
feat(prompts): [brief description of the main change]

[More detailed description explaining the value and what was added/updated]

Updated CHANGE_NOTES.md with complete change details
EOF
)"

## Current Git Status

!git status

## Recent Changes (for reference)

!git log --oneline -5 --no-patch