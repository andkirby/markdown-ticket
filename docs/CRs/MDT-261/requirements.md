# Requirements: MDT-261

Source: [ticket](../MDT-261-unfinished-ticket-templates.md). Full behavioral scope; every canonical item delivers In This Ticket.

## Overview

Agents receive successful creation plus an actionable unfinished-body diagnostic. Commit validation catches generated scaffolding in the index without imposing implementation-stage content on intake tickets. Canonical requirement rows are in requirements.trace.md and maintained through spec-trace.

## Non-Ambiguity Table

| Concept | Chosen meaning | Alternative excluded | Reason |
|---------|----------------|----------------------|--------|
| Missing content | Absent, empty and whitespace-only inputs generate a template | Parameter presence always counts as authored content | Consistency across transports |
| Creation outcome | Success plus warning; no retry instruction | Warning turns creation into failure | Avoid duplicate creation |
| Supplied placeholders | Inspect actual body without claiming it was generated | Only absent input can warn | Catch partially filled tickets |
| Commit source | Full index blob and index configuration | Working file or added lines only | Reliable partial staging |
| Enforcement scope | Changed primary tickets including epics | Every historical ticket and Markdown file | Permit unrelated work |
| Examples | Code/quotation/example contexts are content, not active instructions | Ban all brackets or planning words | Avoid false positives |
| Intake | Genuine concise prose is sufficient; later-stage sections may be absent | Force architecture before intake | Preserve lifecycle |
| Deferred note | Legacy deferral only in Implementation Notes before completion | Exempt all optional sections | Do not hide an unfinished problem |
| Native tools | BB and DSH preserve CLI output | Plugins construct duplicate notices | Existing adapter contract |
| Rollout | Prove in MDT; shared hooks later | Modify consuming projects now | User's rollout boundary |

## Constraint Carryover

- C1–C3: specify schema, compatibility API, detector ownership and template catalog; carry into tests and tasks.
- C4/C6: index adapter and hook tests prove no writes/network/runtime dependence and safe paths/arguments.
- C5: effective tracked Lefthook composition and isolated block/pass evidence required before external rollout.
- Edge-1/Edge-2: rename/space handling and section/status-specific deferral tested independently of unchecked-task enforcement.

## Validation Notes

- BR-2.2 ordinary planning annotations means the TODO, TBD and FIXME prose listed in the ticket policy. Spec-trace 0.4.0 rejects those literal words even in this affirmative requirement; canonical wording uses the defined category to preserve approved meaning without changing the tool.
- No new HTTP endpoint is required. Existing creation transports propagate operation metadata.
- TICKET_TEMPLATE_UNFILLED is the proposed generated-body code; exact API, command, additional codes, marker/catalog packaging and parser contexts are architecture decisions.
- Supplied body and repository paths are untrusted data; C6 applies to subprocess/hook invocation.
