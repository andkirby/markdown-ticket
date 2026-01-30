# Full Specification Mode Template

Use this template when `SPEC_MODE` = "full" (both WHAT and HOW with concrete artifacts).

## Mode-Specific Questions

After common questions (Q0-Q3), ask these additional questions:

### Question 4: Specific Files Modified

Only ask if specific files not mentioned in context.

```
Question: Which existing files need to be modified?
Format: Provide comma-separated file paths (≤5 files)
Example: src/services/UserService.ts, server/routes/users.ts
Constraint: ≤50 characters total
```

**Use answer to**:
- Populate Modified Artifacts table (Section 4.2)
- Identify integration points
- Clarify scope

### Question 5: New Artifacts

Only ask if new files/components not mentioned.

```
Question: What new files or components will be created?
Format: Provide comma-separated paths (≤5 items)
Example: src/services/AuthService.ts, /api/auth/token
Constraint: ≤50 characters total
```

**Use answer to**:
- Populate New Artifacts table (Section 4.1)
- Define scope boundaries
- Set integration points

### Question 6: Decision Status (Full Mode)

```
Question: Have you decided on an implementation approach?
Header: Decision Status
Options:
- Decided with alternatives: I know the approach and considered alternatives (Recommended - produces complete CR)
- Decided, no alternatives: I know the approach but didn't evaluate alternatives
- Need alternatives: Help me evaluate different approaches
- Exploratory: Not sure yet, need to explore options
```

**Use answer to**:
- Determine if Alternatives table can be populated (Section 3)
- Set CR status (Proposed vs. Exploratory)
- Guide approach documentation depth

### Question 7: Chosen Approach

Only ask if Question 6 answered "Decided..." option.

```
Question: Describe your chosen approach in one sentence
Format: ≤15 words
Example: Add JWT middleware to Express server for token-based authentication
```

**Use answer to**:
- Populate Chosen Approach section (2.1)
- Frame rationale bullets
- Set alternatives table context

### Question 8: Alternatives (Full Mode)

Only ask if Question 6 answered "Decided with alternatives":

```
Question: What alternative approaches did you consider?
Header: Alternatives
MultiSelect: true
Options:
- Different library/framework: Considered alternative tech choice
- Different architecture pattern: Considered different design pattern
- Different implementation approach: Same tech, different approach
- No-code solution: Configuration or existing tool instead
- Defer/don't fix: Considered not doing this change
- Other: Specify in ≤10 words
```

**Use answer to**:
- Populate Alternatives Considered table (Section 3)
- Identify constraints and preferences

---

## Document Structure

## 1. Description

### Requirements Scope
`{REQUIREMENTS_SCOPE}` — `full` | `brief` | `preservation` | `none`

### Problem
Write 2-3 bullets describing specific technical issues:
- Specific technical issue with artifact reference
- Missing capability with artifact reference
- Architectural gap with artifact reference

### Affected Artifacts
List files, components, and endpoints affected:
- `path/to/file.ts` (specific concern)
- `Component/ModuleName` (specific concern)
- `/api/endpoint` (specific concern)

### Scope
Clearly define boundaries:
- **Changes**: What will be modified/created
- **Unchanged**: What stays the same

## 2. Decision

### Chosen Approach
One sentence describing the decision.

### Rationale
Write 3-5 bullets with specific, measurable reasons:
- Technical reason (specific, measurable)
- Technical reason (specific, measurable)
- Trade-off accepted (specific)

## 3. Alternatives Considered

Use table format only:

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | One-line description | **ACCEPTED** - Reason for choosing |
| Option A | One-line description | Specific reason |
| Option B | One-line description | Specific reason |

**IMPORTANT**: Mark the chosen approach with **ACCEPTED** in the "Why Rejected" column

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/X.tsx` | Component | Feature X UI |
| `/api/new-endpoint` | Endpoint | Data access |
| `services/Y.ts` | Service | Business logic |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `path/to/file.ts` | Method added | `methodName()` |
| `Component` | Prop changed | Added `propName` |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| Component X | Service Y | Method Z |
| API endpoint | Database | Query type |

### Key Patterns
List patterns as bullets:
- Pattern name: Where applied (artifact reference)
- Pattern name: Where applied (artifact reference)

## 5. Acceptance Criteria

### Functional
Write artifact-specific, testable criteria as checkboxes (NOT in code blocks):
- [ ] File X exports method Y
- [ ] Component Z renders when condition A
- [ ] Endpoint /api/path returns status 200 for input B

### Non-Functional
Write measurable criteria as checkboxes (NOT in code blocks):
- [ ] Test coverage > X% (current: Y%)
- [ ] Operation completes in < Nms (current: Mms)
- [ ] Error type E thrown when condition F

### Testing
Write specific test cases as bullets (NOT in code blocks):
- Unit: Test file X, function Y, input Z → output W
- Integration: Component A + Service B → State C
- Manual: Action sequence → verify result

## 6. Verification

### By CR Type
Choose the appropriate verification approach:
- **Bug Fix**: Issue X no longer occurs in test case Y
- **Feature**: Artifact X exists and test Y passes
- **Refactoring**: Tests pass, metric M improved (before: A, after: B)
- **Performance**: Operation X < target (baseline: Y, target: Z)
- **Documentation**: Files [list] contain sections [list]

### Metrics
ONLY include metrics if ALL three conditions met:
1. Baseline measurement exists
2. Can be verified through testing/measurement
3. CR explicitly targets this metric

If no metrics applicable, list verifiable artifacts that exist after implementation.

## 7. Deployment

### Simple Changes
Use bullets:
- Deployment method
- Configuration changes required

### Complex Changes
Use table format:

| Part | Artifacts Deployed | Rollback |
|-------|-------------------|----------|
| 1 | File A, B | Revert commits X, Y |
| 2 | File C, D | Disable feature flag |

Code blocks ARE allowed in this section for deployment commands:
```bash
npm run deploy
kubectl apply -f config.yaml
```

---

## Quality Checklist (Full Specification Mode)

In addition to [common quality checks](./quality-checks.md):

- [ ] Every technical statement references a concrete artifact (file/component/endpoint/method)
- [ ] Problem section references specific artifacts that have the problem
- [ ] Alternatives table shows concrete differences, not philosophy
- [ ] Section 4 uses tables for artifact specifications
- [ ] Acceptance criteria reference specific artifacts and tests
- [ ] Verification is measurable or references concrete artifacts
- [ ] All metrics have baselines OR section describes artifacts only
- [ ] Alternatives table clearly marks chosen approach with **ACCEPTED**

## Common Errors to Avoid

❌ **WRONG**: Behavioral descriptions like "Component that handles authentication"
✅ **CORRECT**: Artifact specifications like "`AuthService.ts` - Authentication logic"
