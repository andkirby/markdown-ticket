# Requirements Mode Template

Use this template when `SPEC_MODE` = "requirements" (describe WHAT outcome is needed, defer HOW to `/mdt:architecture`).

**Note**: If `CR_TYPE` = "Research", use [research.md](./research.md) instead.

## Mode-Specific Questions

After common questions (Q0-Q3), ask these additional questions:

### Question 6: Decision Status (Requirements Mode)

```
Question: What's the decision status for this requirement?
Header: Decision Status
Options:
- Constraints known: I know the constraints, architecture can decide approach (Recommended)
- Exploratory: Need to explore what's possible first
- Urgent: Need quick solution, will refine later
```

**Use answer to**:
- Determine Open Questions table depth (Section 3)
- Set CR status (Proposed vs. Exploratory)
- Guide constraints documentation

### Question 8: Exploration Areas (Requirements Mode)

Only ask if Question 6 answered "Exploratory":

```
Question: What approaches should architecture explore?
Header: Exploration
MultiSelect: true
Options:
- Multiple libraries: Evaluate different tech options
- Build vs. buy: Compare custom vs. existing solutions
- Performance trade-offs: Evaluate speed vs. complexity
- Integration options: Compare integration approaches
- Leave open: Let architecture decide without constraints
```

**Use answer to**:
- Populate Open Questions table (Section 3)
- Identify constraints and preferences

---

## Document Structure

## 1. Description

### Requirements Scope
`{REQUIREMENTS_SCOPE}` — `full` | `brief` | `preservation` | `none`

### Problem
Write 2-3 bullets describing the problem in outcome terms:
- What users/system cannot do currently
- What pain point or limitation exists
- What opportunity is being missed

### Affected Areas
List general areas (NOT specific files):
- Frontend: Which user-facing area
- Backend: Which service domain
- Database: What data concerns
- Integration: What external systems

### Scope
Clearly define boundaries:
- **In scope**: What outcomes this CR addresses
- **Out of scope**: What outcomes are NOT addressed

## 2. Desired Outcome

### Success Conditions
Write outcome statements (NOT implementation):
- When X happens, Y should result
- Users should be able to Z
- System should support W

### Constraints
List known constraints that architecture must respect:
- Must integrate with existing system X
- Cannot require external service Y
- Must maintain backward compatibility with Z
- Performance must not degrade below N

### Non-Goals
Explicitly state what this CR does NOT aim to achieve:
- Not changing existing behavior X
- Not optimizing for use case Y

## 3. Open Questions

Questions to resolve during architecture/design:

| Area | Question | Constraints |
|------|----------|-------------|
| Technology | Which library/framework to use? | List any technology constraints |
| Architecture | What pattern best fits? | List any architectural constraints |
| Integration | How to connect with existing systems? | List any integration constraints |
| Performance | What trade-offs are acceptable? | List any performance requirements |

### Known Constraints
List constraints that architecture must respect:
- Must use existing system/technology X
- Must not require new infrastructure Y
- Must maintain compatibility with Z

### Decisions Deferred
Explicitly list what this CR does NOT decide:
- Implementation approach (determined by `/mdt:architecture`)
- Specific artifacts (determined by `/mdt:architecture`)
- Task breakdown (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
Write testable outcomes as checkboxes (NOT artifact-specific):
- [ ] User can perform action X
- [ ] System responds with Y when Z occurs
- [ ] Data persists correctly after operation W

### Non-Functional
Write measurable criteria as checkboxes:
- [ ] Response time < Nms for operation X
- [ ] System handles N concurrent users
- [ ] Error rate < X% under normal load

### Edge Cases
List edge cases that must be handled:
- What happens when input is invalid
- What happens when dependent service unavailable
- What happens when user cancels mid-operation

## 5. Verification

### How to Verify Success
Describe verification approach (architecture will detail tests):
- Manual verification: What user actions prove success
- Automated verification: What behaviors to test
- Performance verification: What to measure

---

## Quality Checklist (Requirements Mode)

In addition to [common quality checks](./quality-checks.md):

- [ ] Problem section describes outcomes/limitations, NOT specific files
- [ ] NO specific file paths or implementation details
- [ ] Acceptance criteria are outcome-focused (user/system behaviors)
- [ ] Section 3 "Open Questions" lists decisions for architecture to make
- [ ] "Known Constraints" lists boundaries architecture must respect
- [ ] "Decisions Deferred" explicitly states what this CR does NOT decide

## Common Errors to Avoid

❌ **WRONG**: "Modify `src/services/AuthService.ts` to add validation"
✅ **CORRECT**: "Authentication must validate user credentials before granting access"

❌ **WRONG**: "Add JWT middleware to Express server"
✅ **CORRECT**: "Users must be able to maintain session across requests"
