# UAT Refinement Brief

**Ticket**: MDT-143
**Round**: 2026-05-22 (r6)

## Objective

Add `--json` and `--yaml` output modes to `mdt-cli` so LLM agents and automation can consume ticket and project commands without scraping human terminal text.

## Approved Changes

| # | Change | Reason | Impact |
|---|--------|--------|--------|
| 1 | Add `--json` and `--yaml` to supported ticket and project commands | Agents need stable structured output for reads and mutations | Behavior |
| 2 | Use one JSON-compatible schema for both formats | Prevents drift between JSON and YAML consumers | Architecture / verification |
| 3 | Emit structured errors in structured mode | Agents need parseable failures and stable exit-code handling | Edge behavior |
| 4 | Reject `--json` and `--yaml` together | Avoids ambiguous output negotiation | Edge behavior |

## Changed Requirement IDs

- **BR-22** - `additive_change`: Structured output is a new behavior; existing human output remains valid.
- **C7** - `additive_change`: Structured output must be deterministic and agent-safe.
- **Edge-9** - `additive_change`: Conflicting structured flags are rejected.
- **Edge-10** - `additive_change`: Structured failures use parseable stderr envelopes.

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | Added BR-22, C7, Edge-9, Edge-10 |
| bdd | Added structured success scenarios for ticket detail, ticket list, project output, and mutation output |
| architecture | Added `cli/src/output/structured.ts` and `OBL-structured-output` |
| tests | Added `TEST-cli-structured-output` |
| tasks | Added `TASK-cli-structured-output`; assigned existing `ART-domain-ticket-filters` ownership to list enhancements during validation |

## Execution Slices

### Slice 1: Structured Output Adapter

- **Objective**: Add a schema-owned serializer for JSON/YAML success and error envelopes.
- **Artifacts/files**: `cli/src/output/structured.ts`, `cli/src/index.ts`, command result adapters in `cli/src/commands/*`.
- **Direct GREEN targets**: `emit_structured_ticket_detail_output`, `emit_structured_ticket_list_output`, `emit_structured_project_output`, `emit_structured_mutation_output`, `TEST-cli-structured-output`.
- **Impacted canonical task IDs**: `TASK-cli-structured-output`.
- **Why**: This is the single implementation slice that lets all commands share one agent-facing contract.

### Slice 2: Structured Output E2E

- **Objective**: Prove JSON/YAML parity, deterministic fields, structured errors, and mutually exclusive flag handling.
- **Artifacts/files**: `cli/tests/e2e/output/structured-output.spec.ts`.
- **Direct GREEN targets**: `TEST-cli-structured-output`.
- **Impacted canonical task IDs**: `TASK-cli-structured-output`.
- **Why**: Agent output bugs are contract bugs; E2E should validate real CLI stdout, stderr, and exit codes.

## Validation

- `spec-trace validate MDT-143 --stage requirements --format json` - passed
- `spec-trace validate MDT-143 --stage bdd --format json` - passed
- `spec-trace validate MDT-143 --stage architecture --format json` - passed
- `spec-trace validate MDT-143 --stage tests --format json` - passed
- `spec-trace validate MDT-143 --stage tasks --format json` - passed after assigning `ART-domain-ticket-filters` to `TASK-cli-list-enhancements`

## Watchlist

- Do not generate JSON/YAML by stripping ANSI from human output.
- Keep YAML as a serialization of the JSON object, not a separate hand-shaped payload.
- Include both machine values and display labels where agents need to explain output to users.
- Keep success payloads on stdout and structured failure payloads on stderr.

## Open Decisions

None.
