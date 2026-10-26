---
code: MDT-261
status: Proposed
dateCreated: 2026-10-24T12:37:52.554Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-232
relatedTickets: MDT-233,MDT-229
---

# Prevent committing unfinished ticket templates

## 1. Description

### Requirements Scope
- Full: consistent creation diagnostics and a commit guard against unfinished ticket scaffolding.

### Problem
- MDT-233 was committed with generated instructions instead of ticket-specific content; creation succeeded, but the agent did not finish the document.
- Creation feedback differs across CLI, MCP and DeepSeek Harness (DSH). The CLI has a structured diagnostics array; DSH forwards CLI JSON; MCP constructs its own template notice and describes the generated scaffold as a complete template.
- Current file templates and hardcoded fallback templates contain different instructions. MDT-233 matches the fallback architecture template, so checking only current template files would miss the reported failure.

### Affected Areas
- shared: ticket creation, template generation, content inspection and diagnostic messages.
- domain-contracts: canonical diagnostic and operation-result contracts.
- cli: human and structured creation output; content-validation entry point.
- mcp-server: creation tool responses.
- plugins/dsh: preservation of diagnostics returned by CLI-backed native tools.
- server: HTTP creation-result propagation; frontend creation feedback where applicable.
- scripts and Lefthook: local commit enforcement and verification.

### Scope
- In scope: actionable creation feedback, shared ownership of diagnostic content, deterministic placeholder recognition, staged-ticket validation and local Lefthook integration.
- In scope: a reusable validation entry point that the separate shared hooks repository can consume after local verification.
- Out of scope: implementing ticket features, inventing missing ticket requirements, automatically rewriting historical tickets or changing ticket lifecycle semantics.
- Rollout boundary: first implement and prove the solution locally in MDT. Update $HOME/home/commithooks/ only after local behavior and compatibility are verified; do not roll it out to other consuming projects during the initial validation phase.

## 2. Desired Outcome

### Success Conditions
- Whenever creation actually generates a template body, the successful result explicitly states that placeholders remain and the agent must replace them before committing.
- The notice is based on the generation outcome, not on whether the response includes the document body. Creation remains successful and must not encourage an agent to retry and create a duplicate ticket.
- CLI human output, CLI JSON/YAML, MCP, DSH and HTTP consumers receive equivalent diagnostic meaning from one shared source.
- Supplied content is also inspected: providing a body does not hide recognized unfinished placeholders.
- Commits containing recognized unfinished ticket scaffolding fail with ticket key, relative file path, line or section, offending instruction and a concrete correction.

### Constraints
- Canonical contracts belong in domain-contracts; detection and message construction belong in shared. Shared returns diagnostic data without echo, print or console output for this notice.
- Diagnostics are operation metadata, not persisted ticket frontmatter or domain-entity fields. Reuse the CLI diagnostics envelope instead of adding a parallel warnings envelope.
- Each diagnostic has a stable code, severity, message and ticket/file context; section or line information is included when available. Creation uses warning severity; commit validation reports blocking errors.
- Proposed creation code: TICKET_TEMPLATE_UNFILLED. The canonical message must communicate: the ticket was created with template placeholders, the body is unfinished, and the agent must replace the instructions with ticket-specific content before committing.
- Entry points may format diagnostics for their transport but must not redefine detection rules or maintain separate copies of the message. DSH must preserve diagnostics from CLI JSON without independently generating the same warning.
- Use a shared detector for creation diagnostics and commit validation. Preserve existing create-result consumers through a deliberate compatibility strategy.
- Keep template instructions in one owned source. Recognition must cover file-based templates, fallback templates and compatibility phrases already written to tickets; additions to templates must not silently escape validation.
- The hook reads complete staged blobs and staged configuration needed to identify ticket documents. Unstaged edits must not change the verdict about the proposed commit.
- Discover ticket paths and project codes from project configuration. Scope initial enforcement to added, modified or renamed primary ticket Markdown documents, including epic documents; do not scan every historical ticket or arbitrary specification files on each commit.
- Reuse existing Lefthook plumbing. The hook delegates validation rather than maintaining another copy of placeholder policy. Validation must work locally without network access or a running MDT server.
- A detected MDT project with a missing or failed validator produces an actionable failure rather than silently treating validation as successful.

### Placeholder Policy

| Content | Required behavior |
|---------|-------------------|
| Explicit generated placeholder marker | Block when used as an unfinished instruction in ticket content; future templates should use a deterministic marker convention |
| Known instruction from an active, fallback or legacy template | Block unfinished instruction text after conservative whitespace normalization, including partially filled tickets |
| Body consisting only of headings, comments and generic template boilerplate | Block; deleting instruction text alone must not make an empty scaffold acceptable |
| Ordinary TODO, TBD, FIXME or the word placeholder in prose | Advisory only; a broad keyword match must not block legitimate requirements |
| Markdown links, bracketed technical notation, quoted examples or code samples discussing placeholders | Allow when used as examples rather than unfinished ticket sections |
| Unchecked acceptance criteria before implementation | Allow under this guard; preserve the existing separate Implemented-ticket task policy |
| Legacy instruction in Implementation Notes deferring content until implementation | Allow before completion only in that section; do not demand implementation evidence during intake |

- Future templates should leave later-stage sections empty or omit them until needed rather than inserting generic deferral instructions.
- Recognition must include the architectural problem, current/proposed architecture and rationale instructions found in MDT-233. A broad square-bracket regular expression is insufficient.
- The guard detects unfinished scaffolding; it does not certify the usefulness or correctness of replacement prose.

### Non-Goals
- No blanket ban on TODO markers, Markdown brackets, incomplete checklists or future work.
- No requirement to complete architecture, implementation notes or every workflow stage during ticket creation.
- No persistent draft-state flag that can become stale after direct file edits.
- No immediate migration or cleanup of all existing tickets, including the motivating epic.

## 3. Open Questions

| Area | Decision to resolve during architecture | Constraint |
|------|------------------------------------------|------------|
| Compatibility | How should shared create operations expose diagnostics without breaking existing consumers? | Keep diagnostics outside the persisted ticket and preserve existing transport contracts where possible |
| Templates | What exact marker syntax and instruction catalog should be canonical? | Cover file and fallback generation, legacy recognition and future template changes without duplicated policy |
| Content inspection | What constitutes an empty scaffold, and how are examples distinguished from instructions? | Accept concise real tickets and future-stage omissions; reject remaining intake scaffolding |
| Local hooks | How should the tracked local hook be wired alongside remote Lefthook scripts? | Verify the effective merged configuration; do not rely on ignored local configuration as the sole distributable integration |
| Broader rollout | What dependency/version contract will the shared hook require from MDT? | Prove locally first, then update $HOME/home/commithooks/ with recorded compatibility evidence |

### Known Constraints
- User approved local Lefthook work first and shared-hooks rollout only after verification.
- DSH currently exposes a creation tool without a body parameter; it must still receive the diagnostic and file location. Adding new authoring tools is not a prerequisite for this guard.
- Existing unrelated worktree changes must remain untouched.

### Decisions Deferred
- Exact shared operation API, template marker syntax, detector implementation and command syntax belong to architecture.
- Detailed implementation tasks and automated test layout follow the requirements and architecture stages.
- CI wiring may reuse the same validator after local verification; it must not introduce a second detector or require historical ticket cleanup as part of unrelated changes.

## 4. Acceptance Criteria

### Functional
- [ ] Creating a ticket without body content through each supported creation entry point exposes the same actionable shared diagnostic while reporting successful creation.
- [ ] CLI JSON and YAML retain valid structured envelopes containing diagnostics; CLI human output and MCP render them visibly; DSH preserves them in model-visible tool output.
- [ ] HTTP creation results preserve the same diagnostics, and applicable frontend feedback makes the unfinished-body state visible.
- [ ] Supplying genuine ticket content does not emit a template-generated notice; supplying recognized placeholders still reports the actual content issue.
- [ ] A staged document reproducing MDT-233 is rejected, including its fallback-template wording.
- [ ] A partially completed ticket is rejected when a recognized non-deferred instruction remains.
- [ ] A headings-only or boilerplate-only ticket body is rejected, while a concise ticket with actual problem and outcome content is accepted.
- [ ] Diagnostic contracts, detection rules and canonical message text have one owner each; CLI, MCP, HTTP and DSH contain no independent copies of the placeholder policy.

### Non-Functional
- [ ] The hook validates staged content without reading a live MDT runtime, performing network requests or modifying/staging files.
- [ ] Existing machine consumers remain compatible, or an explicit tested compatibility path is documented.
- [ ] Unchanged historical tickets and unrelated Markdown files do not block a commit.
- [ ] Local enforcement and its effective Lefthook configuration are verified before changes are rolled out through $HOME/home/commithooks/.

### Edge Cases
- [ ] Missing, empty and whitespace-only body inputs follow a documented shared normalization rule across entry points.
- [ ] An unstaged fix cannot conceal placeholders still staged for commit; an unstaged placeholder cannot block a clean staged version.
- [ ] Renamed tickets and paths containing spaces are validated correctly; deleted tickets are skipped.
- [ ] Examples, Markdown links, legitimate technical brackets and ordinary TODO/TBD prose do not cause false blocking.
- [ ] Future-stage omissions and permitted legacy Implementation Notes do not force premature workflow completion.
- [ ] A required validator failure is reported explicitly instead of silently bypassing the check.

## 5. Verification

### How to Verify Success
- Automated: exercise creation diagnostics across shared, CLI structured/human output, MCP, DSH passthrough and HTTP propagation; confirm one diagnostic is surfaced per underlying finding.
- Automated: exercise the detector against current templates, fallback templates and a regression fixture modeled on MDT-233, plus concise valid bodies, partially completed tickets and intentional examples.
- Git integration: use an isolated repository/index to verify staged versus unstaged content, added/modified/renamed/deleted documents, spaces in paths and non-default configured ticket paths/project codes.
- Local manual evidence: demonstrate a blocked scaffold commit and an accepted completed-ticket commit through the actual effective Lefthook configuration without committing to the main worktree.
- Rollout evidence: record the validated CLI/dependency contract and local results before updating $HOME/home/commithooks/; verify a separate consuming project before considering broader rollout complete.
- Traceability: MDT-233 is the motivating example; MDT-232 owns the quality guardrail; MDT-229 is related tooling-hardening work. These links do not create implementation dependencies on those epics.
