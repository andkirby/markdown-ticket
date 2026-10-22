# MDT-258 phases 2–3 execution contract

Decision: **READY**, Execute mode. The user explicitly authorizes implementation,
boundary shape rejection, file-reload validation, and conventional commits in the
shared checkout. Preserve unrelated dirty paths; no server restarts or ticket
status changes. Baseline revision and skill digest are recorded in the result.

## Scope and invariants

The maintenance problem is unchecked mutation envelopes and decoded file reloads
that can overwrite data before shape failures are detected. Use the phase 0–1
`parseRequest` precedent and pure domain schemas. Schema checks own shapes;
services retain normalization, selectors, stateful eligibility and credentials.

Acceptance owners: MDT-258 ticket and boundary-validation-design §B/§C. Stable
acceptance IDs for this execution:

- P2-A: preserve generated codes/default paths, flags, paths/maxDepth, update
  normalization/no-ops, boolean active, server-generated sharing IDs.
- P2-B: reject invalid input/reloads before destination writes, preserve legacy
  values and extension siblings. Preload both files before two-file updates.
- P2-C: retain config selector allowlist/exposure/value authority and existing
  selector/field metadata; add structured issues.
- P3-A: preserve empty pins/favorites, known-project and favorite-eligibility
  rules and tolerant fallback readers.
- P3-B: shape failures return structured 400; credential failures remain 401,
  permission denials remain 403; bodyless invites, optional/nullable expiry and
  opaque identifiers remain accepted.
- P3-C: validate complete log batches before buffers; preserve mode/rate gates.
- R-A: manifest shrinks with no new exceptions; checker fixtures stay green.
- R-B: pre-wiring compatibility fixtures stay green after wiring.

Risks: compatibility transforms/defaults, authorization ordering, nested extension
loss, and partial writes when local reload fails after registry mutation. No
performance improvement is claimed; no new I/O beyond existing write reloads.

## Baseline evidence before production mutation

- Domain build passes; `bun test ./domain-contracts/src`: 349/349.
- Focused server ProjectController/selector/auth-session/devtools-security:
  72/72, six suites.
- Shared ProjectConfigService/ProjectDocumentPatch/configureDocumentsByPath:
  27/27, three suites with isolated CONFIG_DIR.
- Added pre-wiring compatibility fixtures: server Phase23.compatibility 13/13;
  shared project-write-compatibility 4/4. Original assertions retained after wiring.
- Checker: 254 identities, 265 occurrences, 23 decoder modules.
- Known failures: phase-0-1-result documents frontend test-setup TypeScript
  failures, Bun-only suites under Jest and unrelated integration flakes.

## Mutation intent and documentation

Allowed production modifications: domain-contracts project/input and exports;
new pure project write-file/input, app-config/input and access/input schemas;
server HTTP helper/schema projections; Project/Config/Pin/Document controllers;
system/auth/readTokens/share/devtools routes; ProjectConfigService write reloads;
ProjectConfigStorageAdapter write reload and projectSharing write-registry reload;
ConfigApplicationService issue forwarding; boundary legacy manifest deletions.
Allowed tests: focused tests for these surfaces in domain-contracts/src,
server/tests and shared/tests/services/MDT-258, plus existing owning suites when
new structured errors require updated expectations. No MCP or MDT-259 shim edits.

Documentation impact: **NONE** for normative owners. Read project config spec
(storage strategies/legacy and extension preservation), global config spec
(selector storage), and server architecture (adapter/service ownership and
security gates), and searched project/config/sharing/invite/token claims.
The authorized validation changes preserve those claims. The ticket and design
report own new acceptance semantics; retain them unchanged. Record evidence and
Phase 4 handoff in phase-2-3-result.md. Recheck these owners against the final diff.

Artifacts: this immutable plan and requested phase-2-3-result.md in this directory;
command outputs and initial Git inventory in the originating thread storage
(working copies /tmp/mdt258-23). No second refactoring artifact tree.

## Verification

Run domain build/tests; touched server Jest suites with --runInBand; touched
shared Jest suites with isolated CONFIG_DIR and --runInBand; dependent builds;
validate:ts:all (record the known frontend failures); check:boundaries and
test:boundaries; scoped lint and whitespace checks. Temp-file tests prove unchanged
bytes on invalid reloads and preserved parsed siblings on successful writes.
Test schema rejection separately from credential/permission/business failures.
Self-review the exact diff and staged paths before committing. Stop for an
unresolved in-scope regression or scope expansion; do not chase baseline failures.
