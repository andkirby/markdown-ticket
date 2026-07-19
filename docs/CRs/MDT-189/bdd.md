# BDD Scenarios — MDT-189

Related CR: [`MDT-189-dep-graph-foundation.md`](../MDT-189-dep-graph-foundation.md)
Architecture: [`MDT-189/architecture.md`](architecture.md)

The VOC lying-ticket scenario is the canonical acceptance test. Every other
scenario supports or surrounds it.

## `mdt-cli deps --check` (primary surface)

### S1 — VOC lying-ticket detected (the acceptance test)

```gherkin
Feature: mdt-cli deps --check detects lying tickets
  A ticket whose dependsOn references unfinished work must surface as
  unresolved, with the specific dep named.

  Scenario: Ticket depends on an Approved ticket
    Given project "MDT" has ticket MDT-100 with status "Implemented"
    And project "MDT" has ticket MDT-101 with status "Approved"
    And ticket MDT-102 has dependsOn ["MDT-100", "MDT-101"]
    When the user runs "mdt-cli deps MDT-102 --check"
    Then the output contains a row with dep "MDT-100" and kind "satisfied"
    And the output contains a row with dep "MDT-101" and kind "waiting"
    And the output contains evidence 'MDT-101 is "Approved" (waiting)'
    And the summary line reads "Ready: NO (1 unresolved)"
```

### S2 — Cross-project dependency (the VOC scenario)

```gherkin
  Scenario: Ticket depends on a cross-project ticket
    Given the active project is "MDT"
    And project "VOC" has ticket VOC-053 with status "Approved"
    And ticket MDT-188 has dependsOn ["VOC-053"]
    When the user runs "mdt-cli deps MDT-188 --check"
    Then the output contains a row with dep "VOC-053" and kind "waiting"
    And the dep key is rendered fully-qualified as "VOC-053"
```

### S3 — Broken-plan: dep is Rejected

```gherkin
  Scenario: Ticket depends on a Rejected ticket
    Given ticket MDT-101 has status "Rejected"
    And ticket MDT-102 has dependsOn ["MDT-101"]
    When the user runs "mdt-cli deps MDT-102 --check"
    Then the row for MDT-101 has kind "broken-plan"
    And the action field contains "reject-MDT-102 | unlink-MDT-102"
```

### S4 — Broken-plan: dep target missing

```gherkin
  Scenario: Ticket depends on a non-existent ticket
    Given ticket MDT-102 has dependsOn ["MDT-999"]
    And no ticket MDT-999 exists in any registered project
    When the user runs "mdt-cli deps MDT-102 --check"
    Then the row for MDT-999 has status "missing"
    And the row has kind "broken-plan"
```

### S5 — Clean ticket

```gherkin
  Scenario: All dependencies satisfied
    Given ticket MDT-100 has status "Implemented"
    And ticket MDT-102 has dependsOn ["MDT-100"]
    When the user runs "mdt-cli deps MDT-102 --check"
    Then the output contains no violation rows
    And the summary line reads "Ready: YES"
```

### S6 — Ticket with no dependencies

```gherkin
  Scenario: Leaf ticket
    Given ticket MDT-100 has dependsOn []
    When the user runs "mdt-cli deps MDT-100 --check"
    Then the output contains no violation rows
    And the summary line reads "Ready: YES"
```

### S7 — Unknown dep status treated as unsatisfied

```gherkin
  Scenario: Dependency has a legacy or unknown status value
    Given ticket MDT-101 has status "Deferred"  # not in CRStatusSchema
    And ticket MDT-102 has dependsOn ["MDT-101"]
    When the user runs "mdt-cli deps MDT-102 --check"
    Then the row for MDT-101 has kind "waiting"
    And the evidence notes the status is unrecognized
```

Safe default: unknown → unsatisfied. This is the defense against the
legacy-data failure mode that killed the prior validator.

## Prose reconciliation (informational)

### S8 — CR-key tokens in body but not in dependsOn

```gherkin
Feature: --check surfaces prose precondition gaps
  CR keys mentioned in the ticket body but absent from dependsOn are
  surfaced as a separate section, without writing.

  Scenario: Body mentions deps not structured
    Given ticket MDT-188 has dependsOn ["VOC-053"]
    And the body of MDT-188 contains "## Preconditions\nVOC-049–VOC-052 implemented"
    When the user runs "mdt-cli deps MDT-188 --check"
    Then the output contains an "Unverifiable prose" section
    And the section lists "VOC-049", "VOC-050", "VOC-051", "VOC-052"
    And the command exits 0  # informational; no write attempted
```

### S9 — Prose scan limited to precondition sections

```gherkin
  Scenario: CR keys in casual mentions are not flagged
    Given ticket MDT-188 body contains "See also MDT-030 for context."
    And that mention is not in a "## Precondition" or "## Prerequisites" section
    When the user runs "mdt-cli deps MDT-188 --check"
    Then "MDT-030" does not appear in the prose-gaps section
```

## Structured output

### S10 — JSON output shape

```gherkin
  Scenario: Agent / script consumption
    When the user runs "mdt-cli deps MDT-188 --check --json"
    Then stdout is valid JSON matching:
      """
      {
        "schemaVersion": 1, "ok": true, "command": "deps.check",
        "data": {
          "ticket": "MDT-188",
          "ready": false,
          "violations": [{"dep": "...", "status": "...", "kind": "...", "action": "..."}],
          "proseGaps": ["..."]
        }
      }
      """
```

## Migration

### S11 — Dry-run produces a report without writing

```gherkin
Feature: blocks migration is reviewable before commit
  The migration is a one-way door. Dry-run must produce a complete report
  before any file is written.

  Scenario: Dry-run
    Given the repo has ticket MDT-082 with dependsOn ["MDT-071"] and blocks ["MDT-071"]
    When the operator runs "bun run scripts/migrate-blocks.ts --dry-run"
    Then a report is printed listing MDT-082 as a contradiction
    And no file under docs/CRs/ is modified
```

### S12 — Contradiction prompts interactively

```gherkin
  Scenario: Interactive contradiction resolution
    Given ticket MDT-082 has dependsOn ["MDT-071"] AND blocks ["MDT-071"]
    When the operator runs "bun run scripts/migrate-blocks.ts" (real run)
    Then the script prompts: "MDT-082 both dependsOn and blocks MDT-071. Keep dependsOn, drop blocks? [y/N]"
    And on "y" the blocks entry is removed
    And on "n" or EOF the run aborts with no writes
```

### S13 — Post-migration invariant

```gherkin
  Scenario: blocks equals inverse(dependsOn) after migration
    When the migration completes successfully
    Then for every ticket T in every registered project:
      T.blocks == sorted(inverse(all dependsOn edges pointing at T))
    And the report records "Invariant verified: 100% of N tickets"
```

## Write-path removal

### S14 — blocks is no longer user-writable

```gherkin
Feature: blocks becomes a derived field
  After migration, the canonical way to change blocks is to change dependsOn.

  Scenario: Direct blocks write is rejected
    When the user runs "mdt-cli attr 189 blocks+=MDT-999"
    Then the command exits non-zero
    And stderr contains "blocks is derived from dependsOn; edit dependsOn instead"
    And the ticket file is unchanged
```

## Relationship inventory renders by default (UAT 2026-07-19)

The default `mdt-cli deps <KEY>` output shows the ticket's structural role in
the graph, not just readiness. `--check` strict mode preserves the
violations-only contract for scripts.

### S15 — Default output shows relationship inventory

```gherkin
Feature: mdt-cli deps default output shows the relationship inventory
  Readiness is a derived computation over the graph; the default output
  shows the graph, not just the verdict.

  Scenario: Ticket with both upstream and downstream edges
    Given ticket MDT-100 has status "Implemented"
    And ticket MDT-101 has status "Approved"
    And ticket MDT-102 has status "Proposed"
    And ticket MDT-102 has dependsOn ["MDT-100", "MDT-101"]
    And ticket MDT-103 has dependsOn ["MDT-102"]
    When the user runs "mdt-cli deps MDT-102"
    Then the output contains a relationship-inventory section
    And the section lists "MDT-100" and "MDT-101" under "Depends on"
    And the section lists "MDT-103" under "Blocks"
    And each entry shows its current status
```

### S16 — Outgoing-blocks ticket renders blocking role (the MDT-189 case)

```gherkin
  Scenario: Ticket with empty dependsOn but non-empty blocks
    Given ticket MDT-189 has dependsOn []
    And ticket MDT-191 has dependsOn ["MDT-189"]
    When the user runs "mdt-cli deps MDT-189"
    Then the output contains a relationship-inventory section
    And the "Depends on" section is empty or omitted
    And the "Blocks" section lists "MDT-191"
    And the output is NOT a bare "Ready: YES" indistinguishable from a leaf
    And the readiness verdict line is still present
```

### S17 — `--check` strict mode stays violations-only

```gherkin
  Scenario: Strict check mode preserves the pre-UAT contract
    Given ticket MDT-189 has dependsOn [] and blocks ["MDT-191"]
    When the user runs "mdt-cli deps MDT-189 --check"
    Then the output is violations-only (no relationship-inventory section)
    And the output matches the pre-UAT shape
    And existing scripts that grep the check output are not broken
```

### S18 — JSON/YAML output carries `relations` block

```gherkin
  Scenario: Structured output carries the relationship inventory
    When the user runs "mdt-cli deps MDT-189 --json"
    Then stdout is valid JSON with data.relations present
    And data.relations.dependsOn is an array (possibly empty)
    And data.relations.blocks is an array of { key, status } entries
    And the same shape applies to --yaml output
    And the existing data.violations and data.proseGaps fields are unchanged
```
