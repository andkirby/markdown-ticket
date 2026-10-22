# MDT-258 Phases 0–1 execution contract

Mode: Execute. Authorized by the support implementation request. Baseline: 9878e2d20fe8c0e5f75f5992b7afbd4d6963a3c8 (includes the MDT-259 migration).

Decision: READY after baseline domain build and 329 tests, ProjectController 16 tests, and MCP 159 tests passed. Existing frontend type errors and documented integration flakes remain excluded.

Problem: unchecked write objects can reach mutation services, including a status write before malformed priority fails. MCP resolves project context before checking arguments.

Invariants (design report sections B and C): V1 accepted create data, optional priority/default Medium, untrimmed and long titles and plain assignees; V2 partial PUT/PATCH, relationship forms and level aliases; V3 MCP project/key normalization, null attribute no-op, section update alias, absent arguments and unknown tool errors; V4 no service or resolution calls after shape failure; V5 transports retain protocol issue data; V6 checker detects new bypasses and stale exceptions. The sole authorized behavior change is structured rejection of invalid input.

Allowed production changes: domain-contracts ticket input schemas, pure boundary type export and their barrel/type fixture; server HTTP helper/local request projections, ProjectController write methods and OpenAPI mapping; MCP tool wrapper/envelopes/registry and minimal transport argument-default correction; scripts boundary checker and exact legacy/decoder manifest; root package scripts and dedicated boundary CI job. Allowed evidence changes: focused contract/controller/Supertest/MCP/transport/checker tests, this plan and phase-0-1-result.md. No deletes, dependencies, ticket status changes or Phase 2–5 migrations.

Compatibility fixtures run against original handlers before wiring. Phase 0 helpers alone do not change endpoints. Defer optional dead-wrapper cleanup to its owning later phase.

Documentation impact: UPDATE_REQUIRED. Ticket/design report own phased scope; MDT-101 owns canonical contract versus local transport envelope separation; OpenAPI schemas own REST request advertisement. Update the OpenAPI mapping and this ticket's result, retaining historical reports and unrelated dirty files. Review current MCP guide and architecture references for semantic drift after implementation.

Verification: domain build plus bun test domain-contracts/src; server focused Jest --runInBand with service spies and Supertest; complete MCP Jest --runInBand, MCP build; validate:ts:all and root tooling tsc; checker with adversarial fixtures; focused lint and diff whitespace checks. Preserve complete logs under temporary artifact storage and record counts in result. No runtime restart or browser claim. Self-review all changed boundaries and scoped staged diff before conventional commits.
