# MDT Requirements Specification Workflow (v5)

Generate behavioral requirements from CR. Output: `{TICKETS_PATH}/{CR-KEY}/requirements.md`

**Core Principle**: Requirements describe WHAT the system does. Architecture decides WHERE and HOW.

## Skill Discovery

Check `AGENTS.md` for skills matching this workflow. If found, invoke via Skill tool before proceeding.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` from `.mdt-config.toml`.

## When to Use (and When to Skip)

| CR Type | Generate? | Why |
|---------|-----------|-----|
| Feature Enhancement | Yes | New behaviors need specification |
| Complex Bug Fix | Yes (brief) | Multiple behaviors affected |
| Simple Bug Fix | **Skip** | CR acceptance criteria suffices |
| Refactoring | **Skip** | No new behavior → `/mdt:architecture` |
| Tech Debt | **Skip** | Structure change → `/mdt:architecture` |
| Documentation | **Skip** | No behavioral requirements |

**Quick test**: If CR has <3 distinct behaviors, skip requirements.md unless the CR explicitly sets `Requirements Scope`.

**Carryover rule**: Any constraints or edge-case rules in requirements must be carried into architecture and tasks (by ID).
**Deviation rule**: If architecture proposes a simpler alternative that changes a stated requirement, mark it as **Decision Needed** and do not change the requirement until explicitly approved.
**Security rule**: If requirements involve executing external commands or substituting user content (e.g., `{text}` placeholders), include a security constraint for escaping/command injection prevention and carry it forward to tests.
**Traceability rule**: `/mdt:bdd` must not introduce behaviors that are not in requirements. If a needed behavior is missing, add it here or flag for `/mdt:clarification` before writing BDD.

## EARS Syntax (Quick Reference)

| Type | Template | Example |
|------|----------|---------|
| Event | WHEN `<trigger>`, the system shall `<action>` | WHEN user clicks Save, the system shall persist within 200ms |
| State | WHILE `<state>`, the system shall `<action>` | WHILE offline, the system shall queue mutations |
| Error | IF `<condition>`, THEN the system shall `<action>` | IF validation fails, THEN the system shall show field errors |
| Always | The system shall `<action>` | The system shall hash passwords with bcrypt |
| Absence | WHILE `<dependency>` is unavailable, the system shall `<fallback>` | WHILE external detection is unavailable, the system shall proceed without applying a constraint |

**Rules**:
- One requirement = one SHALL
- Pure behavioral (no component names) for features
- Code refs allowed for bug fixes
- Measurable outcomes (timing, counts, states)
- If external dependencies exist, include an Absence requirement for each

## Ambiguity Controls

- Resolve semantic conflicts before writing output (for example: retry-count, idempotency, transition rules).
- For each requirement, declare delivery timing as exactly one of `Now` or `In This Ticket` (no defer wording).
- Define one behavioral truth per concept. If two candidate semantics exist, choose one and record it.
- Include a short `Non-Ambiguity Table` that captures final chosen semantics.

## Execution Steps

### Step 1: Load CR and Check Scope

1. `mdt-all:get_cr` with `mode="full"`
2. Check for `**Requirements Scope**: {full|brief|none}` in CR
3. If specified, honor it and skip the quick test
4. If not specified, infer from CR type (see table above)
5. If scope = `none`, exit with recommendation for `/mdt:architecture`

### Step 1.5: Load CR References for Scope Context

If the CR has a References section, read listed docs for operations that the CR description may abbreviate. Look for:
- API endpoint specifications (HTTP methods and paths)
- Port/repository interface contracts (method signatures)
- Roadmap deliverables for the target milestone

Extract discovered operations into Step 2 even if the CR uses shorthand like "CRUD." Example: CR says "CRUD endpoints" but reference doc specifies create, list-all, get-by-id, update, delete — generate a BR for each.

### Step 2: Extract Behavioral Needs

Scan CR and reference docs for statements to transform:

| Found In | Signal | Becomes |
|----------|--------|---------|
| Problem | "Users need to...", "System should..." | WHEN/WHILE requirement |
| Problem | "Fails when...", "Error occurs..." | IF...THEN requirement |
| Scope | "Add capability to...", "Enable..." | WHEN requirement |
| Acceptance Criteria | Existing checkboxes | Verify coverage |
| Config/Deps | env vars, CLI tools, external APIs | WHILE dependency unavailable requirement |

### Step 2.5: Extract Constraints and Edge Cases

From CR + requirements text, extract constraints and edge cases. Assign each a stable ID (C1, C2...) and record in the Constraints table. These IDs must be referenced later in architecture and tasks.
If the behavior depends on terms like "word", "record", "item", or "request", ensure the requirement defines the unit (e.g., "word = whitespace-delimited token") or flag as a clarification.

### Step 2.6: Resolve Semantic Conflicts

Before generating `requirements.md`, resolve conflicting semantics and lock one final definition per concept:
- Retry/attempt behavior (where counted, who increments, when reset)
- State transitions (allowed from/to transitions + guard conditions)
- Idempotency behavior (dedupe key, replay outcome)
- Any CR term with multiple plausible meanings

Record each choice in `Non-Ambiguity Table` (full scope) or `Semantic Decisions` (brief scope).

### Step 3: Generate Requirements Document

**For Features** (scope = full):

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Generated**: {YYYY-MM-DD}

## Overview

{2-3 sentences: what capability, who benefits, key constraint}

## Behavioral Requirements

### BR-1: {Feature/Behavior Name}

**Goal**: {One sentence user goal}
**Delivery Timing**: {Now | In This Ticket}

1. WHEN {trigger}, the system shall {action}.
2. WHILE {state}, the system shall {behavior}.
3. IF {error}, THEN the system shall {recovery}.

### BR-2: {Feature/Behavior Name}

**Goal**: {One sentence user goal}
**Delivery Timing**: {Now | In This Ticket}

1. {EARS requirement}
2. {EARS requirement}

## Constraints

| Concern | Requirement |
|---------|-------------|
| C1: Performance | {e.g., Response within 200ms} |
| C2: Security | {e.g., Sanitize input before execution} |
| C3: Reliability | {e.g., Failure never blocks core flow} |

## Constraint Carryover

List each constraint ID and where it must appear later:

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Runtime Prereqs / Error Philosophy), tasks.md (Verify) |
| C2 | architecture.md (Module Boundaries), tasks.md (Scope/Verify) |
| C3 | architecture.md (Error Philosophy), tests.md (negative tests) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Retry attempt count | {e.g., Increment on failed processing attempt only} | {e.g., Increment on enqueue} | {why chosen} |
| State transition rule | {allowed transitions + guards} | {rejected transition rule} | {why chosen} |
| Idempotency | {dedupe key + replay behavior} | {rejected behavior} | {why chosen} |

## Configuration

> Include only if feature has settings

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `{ENV_VAR}` | {What it controls} | {value} | {concrete behavior} |

---
*Generated by /mdt:requirements*
```

**For Bug Fixes** (scope = brief):

```markdown
# Requirements: {CR-KEY}

**Source**: [{CR-KEY}](../{CR-KEY}.md)
**Type**: Bug Fix

## Bug

{What's broken, where it manifests}

## Fix Requirements

1. {EARS requirement - code refs allowed}
2. {EARS requirement - code refs allowed}

## Delivery Timing

- R1: {Now | In This Ticket}
- R2: {Now | In This Ticket}

## Semantic Decisions

- {concept}: {chosen semantic} (rejected: {rejected semantic})
- {concept}: {chosen semantic} (rejected: {rejected semantic})

## Verification

- [ ] {How to verify fix}
- [ ] {Regression test}

---
*Generated by /mdt:requirements*
```

### Step 4: Validate

Before saving, produce a validation summary with evidence for each item:

**Scope coverage** (list and count):
- [ ] Endpoints in CR References: {list found} → each has a BR? {missing list}
- [ ] Error codes in Error table: {list} → each has a triggering BR? {missing list}
- [ ] User-input fields: {list} → each has input constraints in a BR or constraint? {missing list}

**Quality** (verify each):
- [ ] Each requirement has one SHALL
- [ ] Outcomes are measurable (not "properly", "correctly")
- [ ] No component names in feature requirements
- [ ] Each feature BR has `Delivery Timing` set to `Now` or `In This Ticket`
- [ ] Bug-fix requirements include a `Delivery Timing` mapping (R1/R2...)
- [ ] Constraints have concrete, measurable targets (not "never", "always" without conditions)
- [ ] Constraint IDs exist and are referenced in Constraint Carryover
- [ ] Terms from Step 2.5 are defined or flagged for clarification
- [ ] Security constraint exists if user content is accepted (per workflow security rule)
- [ ] Semantic conflicts were resolved before output (none left as "TBD")
- [ ] Full scope: Non-Ambiguity Table exists and each concept has one final semantic truth
- [ ] Brief scope: Semantic Decisions exists for each ambiguous concept

### Step 5: Save and Update CR

1. Save to `{TICKETS_PATH}/{CR-KEY}/requirements.md`
2. Add reference in CR Section 5: `> Full requirements: [requirements.md](./requirements.md)`

## What NOT to Include

These belong elsewhere:

| Don't Include | Why | Where It Belongs |
|---------------|-----|------------------|
| Artifact Mapping | Architecture decides structure | architecture.md |
| Large traceability matrices | Ceremony, rarely used | Optional: brief AC coverage list |
| FR-1, FR-2 ID tables | Duplicates EARS | Just use EARS |
| Implementation notes | Not requirements | architecture.md |
| Test specifications | Not requirements | tests.md |

## Examples

**Good (feature - pure behavior)**:
```
WHEN user submits form without required fields, the system shall display validation errors.
WHILE external service is unavailable, the system shall proceed with cached data.
IF authentication fails, THEN the system shall reject the request with 401 status.
```

**Bad (constrains architecture)**:
```
WHEN user submits form, the FormValidator service shall validate fields.
The RequestHandler shall call authenticate() before processing.
```

**Good (bug fix - code refs OK)**:
```
The concurrent access issue in shared resource shall be resolved.
WHEN multiple operations access the same record, data integrity SHALL be preserved.
WHEN asynchronous callback executes, current state SHALL reflect the latest value.
```

## Integration

If this is a Feature Enhancement with user-visible behavior, run `/mdt:bdd` after requirements. Then proceed to `/mdt:architecture` → `/mdt:tests` → `/mdt:tasks`.

```
CR → /mdt:requirements → /mdt:bdd → /mdt:architecture → /mdt:tests → /mdt:tasks
            ↑
       (skip if <3 behaviors)
```

**Output consumed by**: `/mdt:bdd` (E2E scenarios), `/mdt:architecture` (scope understanding)

Context: $ARGUMENTS
