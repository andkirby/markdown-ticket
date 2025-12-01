# MDT Technical Debt Detection Workflow (v1)

On-demand workflow for detecting technical debt patterns in implemented code and flagging them for resolution. Produces inline code comments and CR documentation.

**Core Principle**: Identify structural problems LLM introduced during implementation. Every debt item must reference concrete artifacts and suggest a fix direction.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Problem This Solves

LLMs generate working code that accumulates technical debt:
- Duplicated logic across multiple files (DRY violations)
- Shotgun surgery patterns (one change requires N file edits)
- Missing abstractions (concepts expressed in code without names)
- Hidden coupling (module A knows too much about module B)
- Responsibility diffusion (single concern spread across layers)

LLMs don't flag these issues — they just produce working code. This workflow detects debt patterns and captures them for resolution.

## When to Use

Use this workflow when:
- Implementation complete but code "feels wrong"
- You notice copy-paste patterns emerging
- Adding a feature required touching many files
- Code review reveals structural issues
- After `/mdt-reflection` to document debt formally

Do NOT use when:
- Before implementation (use `/mdt-architecture` instead)
- For functional bugs (use Bug Fix CR)
- For missing features (use Feature Enhancement CR)

## Execution Steps

### Step 1: Load Context

1. Use `mdt-all:get_cr` with `mode="full"` to retrieve CR content
   - Parse CR key, project code, current status
   - If CR doesn't exist, abort: "Create CR first"
   - If CR status is "Proposed" or "Approved", warn: "Tech debt check typically runs after implementation"

2. Extract from CR:
   - Affected artifacts (files that were modified)
   - New artifacts (files that were created)
   - Architecture Design section (if exists — check for violations)

3. If codebase access available, scan the actual implementation files for patterns.

### Step 2: Detect Debt Patterns

Analyze implementation against these debt categories:

| Pattern | Detection Signal | Severity |
|---------|------------------|----------|
| **Duplication** | Same/similar logic in 2+ locations | High |
| **Shotgun Surgery** | Adding X requires editing N files (N > 1) | High |
| **Missing Abstraction** | Concept in code without class/interface/type name | Medium |
| **Hidden Coupling** | Module imports internal details of another module | Medium |
| **Responsibility Diffusion** | Single concern spread across 3+ files/layers | High |
| **God Object** | One file/class handles multiple unrelated concerns | Medium |
| **Primitive Obsession** | Complex concept represented as primitive (string, number) | Low |
| **Feature Envy** | Function uses more data from other module than its own | Low |

For each detected pattern, capture:
- **Pattern name**: Which debt type
- **Location**: Specific file(s) and line numbers if possible
- **Evidence**: What indicates this is debt (e.g., "3 identical blocks")
- **Impact**: What happens when you need to extend/modify
- **Severity**: High / Medium / Low

### Step 3: Check Architecture Violations

If CR has `## Architecture Design` section:

1. Extract the **Extension Rule**
2. Test mentally: "Does current implementation follow this rule?"
3. If violated, flag as High severity debt

Example:
- Extension Rule: "To add adapter, create one file in `src/adapters/`"
- Actual: Adding adapter requires editing 3 files
- Violation: Architecture design not followed

### Step 4: Present Findings

Present detected debt to user for review:

```markdown
## Technical Debt Detected

**CR**: [PROJECT-XXX]
**Files Analyzed**: [N]
**Debt Items Found**: [N]

### High Severity

#### 1. [Pattern Name]: [Brief Description]
- **Location**: `path/to/file.ts` (lines X-Y), `path/to/other.ts` (lines A-B)
- **Evidence**: [What you observed, e.g., "Identical 15-line blocks in 3 files"]
- **Impact**: [What breaks or gets harder, e.g., "Adding new provider requires editing 3 files"]
- **Suggested Fix**: [Direction, not full solution, e.g., "Extract to shared utility or base class"]

#### 2. [Pattern Name]: [Brief Description]
...

### Medium Severity
...

### Low Severity
...

---

**Actions**:
- Reply "document" to add these findings to the CR
- Reply "fix [number]" to start a fix session for specific item
- Reply "ignore [number]" to skip specific items
- Reply "all" to document all and create follow-up CR for fixes
```

Wait for user confirmation before proceeding.

### Step 5: Generate Inline Comments

For each confirmed debt item, generate inline code comment suggestion:

```typescript
// TECH-DEBT: [Pattern] - [Brief description]
// Impact: [What breaks when extending]
// Suggested: [Fix direction]
// See: [CR-KEY] for details
```

**Comment placement rules**:
- Place at the START of the problematic code block
- For duplication: comment on FIRST occurrence, reference others
- For missing abstraction: comment where the concept is most used
- Keep comment under 4 lines

Present comments to user:

```markdown
### Suggested Inline Comments

**File**: `src/handlers/user-handler.ts`
**Line**: 45
```typescript
// TECH-DEBT: Duplication - Same validation logic in 3 handlers
// Impact: Validation change requires editing user, order, product handlers
// Suggested: Extract to ValidationService or shared utility
// See: AAA-010 for details
```

**File**: `src/services/order-service.ts`
**Line**: 112
...
```

User can:
- Accept all comments
- Accept selectively
- Skip inline comments (document in CR only)

### Step 6: Update CR

After user approval, update the CR:

1. **Add/Update Technical Debt Section**:
   - Create `### Identified Technical Debt` under `## 8. Clarifications` (or create Section 8 if missing)
   - Add session subheading: `#### Tech Debt Review YYYY-MM-DD`

2. **Document Each Debt Item**:
   ```markdown
   #### Tech Debt Review 2025-01-15

   **1. [Pattern]: [Description]**
   - Location: `file.ts` (lines X-Y)
   - Severity: High
   - Impact: [Extension/maintenance impact]
   - Suggested Fix: [Direction]
   - Status: Documented / Fix Planned / Deferred

   **2. [Pattern]: [Description]**
   ...
   ```

3. **Link to Follow-up** (if user chose to create fix CR):
   - Add `Related CRs: [NEW-CR-KEY] (Tech debt fix)`

### Step 7: Create Follow-up CR (Optional)

If user requests, create a Technical Debt CR:

```json
{
  "project": "PROJECT_CODE",
  "type": "Technical Debt",
  "data": {
    "title": "Refactor: [Brief description of debt pattern]",
    "relatedTickets": "ORIGINAL-CR-KEY",
    "content": "... generated from debt findings ..."
  }
}
```

The follow-up CR should:
- Reference the original CR
- List all debt items to address
- NOT include the full fix (that requires separate architecture session)
- Set status to "Proposed" for prioritization

### Step 8: Report Completion

```markdown
## Technical Debt Review Complete

**CR**: [PROJECT-XXX]
**Session**: YYYY-MM-DD

### Summary
- Debt items found: [N]
- High severity: [N]
- Medium severity: [N]
- Low severity: [N]

### Actions Taken
- [ ] Documented in CR Section 8
- [ ] Inline comments generated: [N]
- [ ] Follow-up CR created: [CR-KEY or "None"]

### Inline Comments
[List of files with suggested comments, or "Skipped"]

### Next Steps
- Review inline comments and add to codebase
- Prioritize follow-up CR if created
- For complex fixes, run `/mdt-architecture` on follow-up CR before implementing
```

## Debt Pattern Reference

### Duplication (High)

**Signal**: Same/similar code in multiple places
**Example**:
```
src/handlers/user-handler.ts:45    → if (input.email && !validateEmail(input.email)) {...}
src/handlers/order-handler.ts:67   → if (input.email && !validateEmail(input.email)) {...}
src/handlers/product-handler.ts:89 → if (input.email && !validateEmail(input.email)) {...}
```
**Impact**: Change to validation requires 3 edits
**Fix Direction**: Extract to shared validation utility

### Shotgun Surgery (High)

**Signal**: Adding one thing requires editing many files
**Example**: "To add new payment provider, must edit: config.ts, types.ts, handler.ts, factory.ts, tests/"
**Impact**: High change amplification, error-prone
**Fix Direction**: Consolidate to single extension point (adapter pattern)

### Missing Abstraction (Medium)

**Signal**: Concept exists in code but has no name
**Example**: Multiple functions pass around `{userId, email, role}` as separate params
**Impact**: No type safety, concept implicit
**Fix Direction**: Create `UserContext` type/interface

### Hidden Coupling (Medium)

**Signal**: Module imports internal details of another
**Example**: `import { _internalHelper } from '../other-module/internals'`
**Impact**: Changes to internals break dependent modules
**Fix Direction**: Expose proper public API, hide internals

### Responsibility Diffusion (High)

**Signal**: Single concern spread across layers
**Example**: "User validation" logic in: controller, service, repository, utils
**Impact**: Hard to understand full behavior, changes cascade
**Fix Direction**: Consolidate in single service/module

## Behavioral Rules

- **On-demand only**: Never run automatically, user must invoke
- **Present before documenting**: Always show findings for approval
- **Severity-based ordering**: High → Medium → Low
- **Fix direction, not full solution**: Suggest approach, don't design the fix
- **Respect user decisions**: If they say "ignore", don't persist
- **Link to architecture**: For complex fixes, recommend `/mdt-architecture` session
- **No false positives**: Only flag clear debt patterns with evidence
- **Concrete locations**: Every debt item must have file path(s)

## Anti-Patterns to Avoid

❌ **Vague debt description**: "Code could be cleaner"
✅ **Specific debt**: "Duplication: 15-line block repeated in 3 handler files"

❌ **No location**: "There's some coupling somewhere"
✅ **With location**: "Hidden coupling: `order-service.ts:45` imports internal from `user-module`"

❌ **Prescriptive fix**: "Create AbstractBaseHandlerFactory with these methods..."
✅ **Fix direction**: "Extract to shared utility or base class"

❌ **Flagging style issues**: "Variable names could be better"
✅ **Flagging structural issues**: "Missing abstraction for user context passed through 5 functions"

## Integration with Other Workflows

**Before this workflow**:
- Implementation complete (code exists to analyze)
- Optionally: `/mdt-reflection` to capture learnings first

**After this workflow**:
- Fix immediately (if simple)
- Create follow-up CR (if complex)
- Run `/mdt-architecture` on follow-up CR before implementing fix

**Trigger phrases**:
- "Check tech debt in [CR-KEY]"
- "Review [CR-KEY] for technical debt"
- "Run tech debt scan on [CR-KEY]"

## Quality Checklist

Before completing, verify:
- [ ] Every debt item has concrete file location(s)
- [ ] Severity assigned to each item
- [ ] Impact explains what breaks/gets harder
- [ ] Fix direction provided (not full solution)
- [ ] User approved before documenting
- [ ] CR Section 8 updated with findings
- [ ] Inline comments are under 4 lines each
- [ ] Follow-up CR linked if created

Context for analysis: $ARGUMENTS
