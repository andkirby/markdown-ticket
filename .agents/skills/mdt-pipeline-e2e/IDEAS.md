# mdt-pipeline-e2e — Ideas to Improve

Potential enhancements for future polishing. Not committed — just captured.

## Spec Phase

### Spec drift detection
After each spec milestone, diff the new artifacts against the ticket's acceptance criteria.
If something was lost between stages, flag it before the next milestone starts.
Currently relies on self-review within each milestone.

### Prior artifact validation
Before generating a new stage, verify the prior stage's artifacts haven't been manually
edited since last milestone. If they have, re-validate them. Prevents silent drift when
user edits requirements.md between pipeline runs.

### BDD → Architecture trace matrix
Auto-generate a traceability matrix linking every BDD scenario to an architecture
component. Makes the architecture review faster — reviewer can see at a glance which
scenarios each module is responsible for.

## Implementation Phase

### Per-task commits
Currently commits all implementation as one. For larger tickets, commit after each task
(or logical group of tasks). Makes git bisect and rollback easier.
Trade-off: more commits, more overhead per task.

### Part support
`mdt:implement` supports `--part X.Y` for multi-part tickets. The pipeline always uses
`--all`. For large tickets, the pipeline could detect multiple parts in tasks.md and
run them sequentially with checkpoints between parts.

### TDD progress dashboard
Show a running tally during implementation:
```
Tasks: 12/18 complete
Tests: 34 GREEN, 0 RED
Build: ✅
Time: ~14 min
```
Requires show_widget or terminal output. Low priority but nice UX.

## Code Review

### Review against architecture
During code review, re-read `architecture.md` and verify the implementation actually
follows it. Currently the review checklist is generic — it doesn't cross-reference the
specific architectural decisions made in milestone 4.

### Diff-size gate
If the implementation diff exceeds a threshold (e.g. 500 lines changed), warn the user
that this is a large change and suggest splitting into smaller tickets.
Prevents monster PRs.

### Mutation testing
Run a mutation testing tool (e.g. Stryker) to verify test quality. If tests don't catch
injected mutations, the TDD cycle was superficial. Heavy — CI-only, not every run.

## Close Phase

### Reflection integration
After close, offer to run `mdt:reflection` to capture what was learned during the pipeline
run. Useful for improving future pipeline runs on similar tickets.
Currently skipped because it can over-saturate the pipeline.

### Spec-to-code drift report
After implementation, compare the final code against the original spec artifacts.
Flag any requirements that were dropped or architecture patterns that changed during
implementation. Gives the user confidence nothing was silently abandoned.

### Changelog entry
Auto-generate a CHANGELOG.md entry from the ticket title and type.
Respects conventional commit format already used.

## Operational

### Pipeline state file
Write a `.pipeline-state.json` to the ticket directory tracking:
- Which milestones completed
- Timestamps
- Iteration counts
- Whether user approved each checkpoint

Enables true resume — if the agent crashes, it can read state and pick up where it left off.
Currently `--from` is manual and doesn't track history.

### Parallel spec milestones
Some spec milestones are independent and could run in parallel (e.g., tests and tasks
both read architecture but don't depend on each other). Would require team support.
Low priority — sequential is simpler and safer.

### Pipeline dry-run / plan mode
`--plan` flag that shows what milestones would run, what artifacts exist, what's missing,
and estimated scope — without executing anything. Good for "should I run the pipeline?"
moments.

### Configurable pre-flight strictness
Instead of boolean `--ignore`, allow granular config:
```
--preflight=strict     # dirty git blocks, baseline required
--preflight=relaxed    # warn on dirty git, skip baseline
--preflight=off        # no checks, just go
```

### Retry budget
Instead of hard "max 3 retries", give the pipeline a total retry budget
(e.g. 10 retries across all milestones). Lets it spend more retries on hard
stages while keeping total execution bounded.
