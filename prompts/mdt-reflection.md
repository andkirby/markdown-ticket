# MDT Ticket Reflection Workflow (v1)

Capture post-implementation learnings from the conversation and encode them into CR tickets. Focus on **artifact-level insights** and **specification adjustments**—NOT on abstract learnings or process improvements.

**Core Principle**: Reflect on what was learned about artifact specifications, integration requirements, and verification approaches during implementation. Every learning must reference concrete artifacts and produce actionable spec updates.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

You **MUST** consider the user input before proceeding (if not empty).

## Outline

**Goal**: Extract specification-level learnings from the conversation (especially post-implementation discussions) and encode them into the CR ticket. Focus on **WHAT** artifact specifications changed, **WHICH** artifacts were affected, and **HOW** verification approaches evolved—NOT on abstract principles or process learnings.

**Context**: This command is typically run after implementation or during implementation when important specification insights emerge that should be captured in the CR for future reference.

## Execution Steps

1. **Load CR Context**:

   Use `mdt-all:get_cr` with mode="full" to retrieve CR ticket:
   - Parse CR key, project code, current status
   - If ticket doesn't exist, abort and instruct user to create CR first
   - If ticket status is "Rejected", warn that reflection may not be appropriate
   - If ticket status is not "Implemented", confirm user wants to reflect on in-progress work

2. **Analyze Recent Conversation**:

   Review the conversation history (especially the last 10-20 messages before this command) to identify:

   **Include (Artifact & Specification Insights)**:
   - Artifact specifications discovered during implementation (files, components, endpoints, methods)
   - Integration points found in actual implementation
   - Verification approaches that worked/failed
   - Acceptance criteria adjustments based on actual testing
   - Edge cases discovered in artifact interactions
   - Performance baselines measured during implementation
   - Deployment artifacts or rollback procedures identified
   - Missing artifacts discovered during implementation
   - Modified artifact interfaces or signatures
   - Pattern applications that emerged during coding

   **Exclude (Abstract Learnings & Process Details)**:
   - General architectural principles not tied to specific artifacts
   - Team process improvements or workflow changes
   - Tooling or development environment discoveries
   - Abstract design patterns without artifact references
   - Generic "lessons learned" without concrete specifications
   - Code quality observations without measurable criteria
   - Developer experience insights
   - Estimation or planning process learnings

3. **Categorize Learnings**:

   Organize extracted insights into these categories:

   - **Artifact Discoveries**: Files, components, or endpoints found during implementation
   - **Specification Corrections**: Errors or gaps in original artifact specs
   - **Integration Changes**: Modified or new integration points between artifacts
   - **Verification Updates**: Changed testing approaches or acceptance criteria
   - **Performance Baselines**: Measured metrics during implementation
   - **Deployment Insights**: Discovered deployment artifacts or procedures
   - **Edge Case Artifacts**: New error handling or boundary condition components
   - **Pattern Refinements**: Adjusted pattern applications with artifact references

   For each learning, prepare:
   - **Category**: Which category it belongs to
   - **Artifact Reference**: Specific file/component/endpoint affected
   - **Original Spec**: What the CR originally specified (if applicable)
   - **Actual Implementation**: What was actually implemented
   - **Impact**: How this affects the CR's artifact specifications
   - **Target Section**: Which CR section(s) should be updated

4. **Present Learnings for Review**:

   Before updating the CR, present all categorized learnings to the user:

   ```markdown
   ## Post-Implementation Learnings Summary

   I've identified [N] artifact-level insights from our conversation:

   ### [Category 1]: Artifact Discoveries

   1. **[Artifact Name/Path]**
      - Original Spec: [What CR specified or didn't specify]
      - Actual Implementation: [What was actually created/modified]
      - Impact: [How this affects CR artifact specifications]
      - Will update: [Target CR section(s)]

   2. **[Artifact Name/Path]**
      - Original Spec: [What CR specified]
      - Actual Implementation: [What was actually implemented]
      - Impact: [How this affects CR]
      - Will update: [Target CR section(s)]

   ### [Category 2]: Specification Corrections

   [... continue for each category ...]

   ---

   **Review Instructions**:
   - Reply "yes" or "proceed" to accept all learnings
   - Reply with specific numbers to exclude (e.g., "exclude 2, 5")
   - Reply "edit" to modify specific learnings before encoding
   - Reply with additional artifact insights I might have missed
   ```

   Wait for user confirmation before proceeding.

5. **Update CR Ticket**:

   After user approval, update the CR with the learnings:

   a. **Create/Update Post-Implementation Section**:
      - Ensure `## 8. Clarifications` section exists (create after Section 7 if missing)
      - Under it, create `### Post-Implementation Session YYYY-MM-DD` subheading
      - Document each learning as a bullet with category tag and artifact reference

   b. **Integrate into Relevant Sections**:

      For each approved learning, update the appropriate section(s):

      - **Artifact Discoveries** → Add rows to `### New Artifacts` or `### Modified Artifacts` tables
      - **Specification Corrections** → Update `### Problem`, `### Affected Artifacts`, or `### Scope`
      - **Integration Changes** → Update `### Integration Points` table
      - **Verification Updates** → Modify `### Functional` or `### Non-Functional` acceptance criteria
      - **Performance Baselines** → Add to `### Metrics` with measured values
      - **Deployment Insights** → Update `### Simple Changes` or `### Complex Changes` deployment plan
      - **Edge Case Artifacts** → Add rows to `### Modified Artifacts` for error handling components
      - **Pattern Refinements** → Update `### Key Patterns` with actual artifact applications

   c. **Update Alternatives Table**:
      - If implementation revealed why an alternative would have been better, update rejection reasons
      - Add implementation experience notes to chosen approach row
      - Mark any reconsidered alternatives

   d. **Maintain Consistency**:
      - If a learning contradicts original spec, replace old spec content with `(Updated post-implementation: YYYY-MM-DD)`
      - Mark deprecated artifacts or approaches with strikethrough and update date
      - Preserve MDT template formatting rules (tables, headers, no code blocks except Section 7)
      - Ensure all updated statements reference concrete artifacts
      - Remove any behavioral descriptions that may have crept in

6. **Validation**:

   After updating the CR, validate:
   - All learnings are encoded in appropriate sections with artifact references
   - No abstract principles or process learnings leaked into CR
   - Post-Implementation session contains summary with artifact references
   - Updated sections maintain MDT quality (artifact-focused, measurable, testable)
   - No contradictory statements remain (old specs properly deprecated)
   - Markdown structure follows MDT template rules
   - Tables properly formatted with new rows added correctly
   - Alternatives table still marks chosen approach with **ACCEPTED**
   - Every technical statement references a concrete artifact
   - Performance metrics include baselines (before/after)

7. **Update CR Status** (if appropriate):

   If CR is being marked as implemented:
   - Use `mdt-all:update_cr_status` to change status to "Implemented"
   - Use `mdt-all:update_cr_attrs` to add implementationDate and implementationNotes

8. **Report Completion**:

   Provide a summary:

   ```markdown
   ## CR Updated with Post-Implementation Learnings

   **CR**: [PROJECT-XXX]
   **Status**: [Current status]
   **Session**: YYYY-MM-DD
   **Learnings Captured**: [N] artifact-level insights

   ### Sections Updated:
   - [Section name 1]: [Brief description of changes with artifact references]
   - [Section name 2]: [Brief description of changes with artifact references]

   ### Summary of Changes:
   - Added [N] new artifacts to specifications
   - Modified [N] existing artifact specs
   - Updated [N] integration points
   - Adjusted [N] acceptance criteria
   - Recorded [N] performance baselines

   ### Artifact Specificity:
   - **Before**: [X]% of statements with artifact references
   - **After**: [Y]% of statements with artifact references
   - **Improvement**: [Y-X]%

   ### Specification Quality:
   - Behavioral descriptions removed: [N]
   - Placeholders resolved: [N]
   - Metrics with baselines added: [N]

   ### Recommended Next Steps:
   - [ ] Review updated CR for completeness
   - [ ] Update related CRs if dependencies affected
   - [ ] Mark CR as "Implemented" if complete (use mdt-all:update_cr_status)
   - [ ] Create follow-up CRs for discovered scope additions
   ```

## Behavioral Rules

- **Focus on artifacts, not abstractions**: Only capture learnings about specific files, components, endpoints, methods
- **No process learnings**: Exclude team process, development workflow, or tooling insights
- **Always get approval**: Present all learnings before updating the CR
- **Maintain MDT quality**: Updated content must reference concrete artifacts and follow template rules
- **Handle contradictions**: When learnings contradict original spec, deprecate old content explicitly with dates
- **Preserve structure**: Follow MDT template section structure and formatting rules
- **Document changes**: Mark updated specs with post-implementation dates
- **Cross-reference artifacts**: Ensure artifact changes in one section are reflected in related sections (e.g., Modified Artifacts ↔ Integration Points)
- **Limit session**: If conversation has no meaningful artifact-level learnings, report that and suggest alternatives
- **Handle empty input**: If no recent conversation, ask user to describe the artifact insights they want to capture

## Special Cases

1. **No Artifact Learnings Found**:
   - Report: "No significant artifact-level insights detected in recent conversation"
   - Suggest: Ask user if they have specific artifact discoveries to capture manually
   - Don't capture abstract principles or process learnings

2. **Abstract Learnings Detected**:
   - Filter them out automatically
   - Mention to user: "I filtered out [N] abstract learnings—focusing on artifact specifications only"
   - Example filtered: "We learned that modularity is important" (no artifact reference)

3. **Contradictory Specifications**:
   - Highlight contradictions to user before updating
   - Ask which specification (original or discovered) is correct
   - Deprecate incorrect spec with clear marking

4. **CR Ticket Missing**:
   - Abort and instruct user to create CR first using mdt-all:create_cr

5. **Major Specification Changes**:
   - Warn user that significant spec changes may indicate original CR was underspecified
   - Suggest creating a follow-up CR for major discovered scope
   - Don't try to retroactively fix a fundamentally wrong original spec

6. **Multiple Reflection Sessions**:
   - Each run creates a new post-implementation session entry
   - Previous learnings remain in their session contexts
   - New learnings can deprecate previous specs if contradictory

7. **Performance Baselines Without Context**:
   - Don't add metrics unless both baseline and target are clear
   - Only include measurable, verifiable performance data
   - Reject vague statements like "improved performance"

## Example Learning Extraction

**Good Examples** (Include):
- "Created `src/utils/ValidationHelper.ts` not originally specified; should add to Modified Artifacts"
- "Integration point between `UserService` and `AuthService` uses `validateToken()` method; update Integration Points table"
- "Measured baseline: API response time 450ms; target was 200ms; update Metrics section"
- "Discovered edge case: `ProfileComponent` needs error boundary; add to Modified Artifacts"
- "Deployment requires `config/feature-flags.json` modification; add to deployment plan"
- "Pattern 'Repository pattern' actually applied to `DataRepository.ts` and `CacheRepository.ts`; update Key Patterns"

**Bad Examples** (Exclude):
- "We learned that good error handling is important" ✗ (abstract principle, no artifact)
- "The team found pair programming helpful" ✗ (process learning)
- "TypeScript is a better choice than JavaScript" ✗ (tooling opinion, no artifact)
- "Code reviews caught several bugs" ✗ (process observation)
- "We should write more tests" ✗ (abstract recommendation)
- "The architecture is more modular now" ✗ (vague claim, no artifact reference)

## Artifact Reference Requirements

Every learning MUST include:
- Specific file path (e.g., `src/components/UserProfile.tsx`)
- OR specific component name (e.g., `AuthenticationService`)
- OR specific endpoint (e.g., `/api/v2/users/profile`)
- OR specific method/function (e.g., `validateCredentials()`)
- OR specific configuration file (e.g., `config/database.yaml`)

Learnings without artifact references will be automatically filtered out.

## Context for Reflection

User's additional context (if provided): $ARGUMENTS