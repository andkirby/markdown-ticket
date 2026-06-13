# MDT Workflow Reference

Use this reference when the user says "use MDT flow", "use MDT workflow", or
asks to run the pipeline with MDT stage skills. MDT flow is a portable workflow
system; it is not limited to the markdown-ticket repository.

## First Prompt Shape

Accepted concise prompt:

```text
Load mdt-pipeline-e2e for <TICKET>. Use MDT flow.
```

Equivalent explicit prompt:

```text
Run mdt-pipeline-e2e for <TICKET> using the MDT workflow system.
Load `mdt` first, then use the matching `mdt:*` stage skill for each milestone.
Treat the current repository as the target project and follow its local docs,
paths, ticket config, commands, UX conventions, and verification rules.
```

## Required Skill Loading

1. Load the `mdt` workflow index first.
2. For each milestone, load the matching MDT stage skill before producing or
   updating artifacts.
3. Still read project-local instructions and skill registries. Local project
   docs decide paths, commands, ticket status names, UX conventions, and
   verification commands.

## Stage Mapping

| Pipeline milestone | MDT stage skill |
|--------------------|-----------------|
| Assess | `mdt:assess` |
| Requirements | `mdt:requirements` |
| Scenarios | `mdt:bdd` |
| Architecture | `mdt:architecture` |
| Tests | `mdt:tests` |
| Tasks | `mdt:tasks` |
| Implement | `mdt:implement` or `mdt:implement-agentic` when available and appropriate |
| Debt | `mdt:tech-debt` |
| Reflection | `mdt:reflection` when requested or project workflow requires it |

Use optional MDT skills when the ticket needs them:

- `mdt:clarification` for missing requirements or unresolved questions.
- `mdt:poc` for risky technical assumptions.
- `mdt:domain-lens` before architecture when strategic domain boundaries matter.
- `mdt:domain-audit` when existing code structure must be assessed.
- `mdt:uat` for same-ticket user-review refinements.

## UX In MDT Flow

MDT stage skills do not own project-specific UX writing unless a project says
they do. For UI work:

1. Read the project skill registry.
2. Use the project UX designer skill first when available.
3. Otherwise use the global UX designer/specifier skill.
4. Write the ticket-local UX draft.
5. Run the UX reviewer gate.
6. Update durable design docs only after approval.

## Artifact Rule

Write artifacts to the current project's ticket artifact location. Do not assume
`docs/CRs/` unless the project documents it.

When a stage skill specifies a canonical file format, follow it unless the
target project overrides the format.
