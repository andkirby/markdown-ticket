# Ralph Loop Reference

Use this reference only when the host agentic app exposes Ralph loop tools or an
equivalent protocol. If these tools are unavailable, do not mention raw
`ralph_start` or `ralph_done`; use normal milestone planning language.

## Purpose

Ralph is a milestone loop. Each iteration owns exactly one milestone, records
evidence, then advances.

## Start

When available, start the loop before milestone 1:

```yaml
ralph_start:
  name: "pipeline-<ticket>"
  task: "<milestone plan>"
  maxIterations: 50
  itemsPerIteration: 1
  reflectEvery: 5
```

## Iteration Contract

For each milestone:

1. Load only the required project docs, skills, and references.
2. Execute the milestone.
3. Self-review produced artifacts or changes.
4. Update the pipeline state file.
5. Report evidence.
6. Call `ralph_done` only when the milestone is complete.

## Fallback

Without Ralph tools:

- Say "Starting <milestone>".
- Execute the same milestone contract.
- Say "<milestone> complete" with artifacts and evidence.
- Continue to the next milestone.
