# MDT-258 phases 2–3 result

Status: **READY for scoped review**. Phase 2/3 acceptance gates pass. Repository-wide
TypeScript retains the documented frontend baseline failure; no unrestricted
whole-repository readiness claim. Ticket status is unchanged.

Baseline: `51b8f803ce95c014af36b09ad70048e3d9e6e311` (includes `802c074d`).
Mode: Execute, implementation and commits explicitly authorized by the user.
Plan: [phase-2-3-plan.md](phase-2-3-plan.md), SHA-256
`a15e9db3f5f4ece07f288556ca82cb94ecc97aa68157dc053ec7c8c15d204b32`.
Controlled-refactor skill SHA-256:
`569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f`.

## Implemented scope

- Project registration uses the actual manager contract: name/path required,
  optional generated code/default tickets path, both flags, document paths and
  maxDepth. The manager's public creation type derives from that schema.
- Project update, sharing, enable/disable and configure-documents parse at their
  adapters. Existing text normalization and business checks remain authoritative;
  active must be boolean and supplied share IDs are rejected.
- Config PATCH parses its envelope; ConfigApplicationService still owns selector
  allowlisting, exposure and value validation. Both envelope and selector/value
  errors carry issues; existing field/selector metadata remains.
- Compatible write-file schemas preserve raw spelling, optional legacy fields,
  string counters, empty preview settings and nested extension keys. Two-file
  updates parse both reloads before the first write. Project creation preflights
  an existing local file before registry/counter creation. Invalid destination
  reloads fail closed in project-config writes and sharing.
- Pins, favorites, preview issuance, selector state, login/read-token bodies,
  read-token creation, invite creation/exchange, revocation, share exchange and
  both log batches use parsed envelopes. Capability/permission/rate gates retain
  precedence. Credential verification, eligibility and fallback readers remain
  service-owned. Bodyless invite creation and optional/nullable expiry work.
- Complete log batches validate before insertion; a malformed entry rejects the
  entire batch without changing the buffer or DEV rate count.

## Baseline and compatibility gate

Before production wiring: domain build and **349 domain tests** passed; focused
server baseline **72 tests / 6 suites** and shared baseline **27 / 3** passed.
New compatibility fixtures passed against original code: **13 server cases** and
**4 real-file shared cases**. They remain green after wiring.

These fixtures record actual forwarding and persistence, including manager
generation/defaults, lowercase/empty code/path forms, project no-ops, empty
pin/favorite/document sets, token normalization, four expiry forms, bodyless
invites, extension-bearing logs and legacy file siblings. Registration forwards
maxDepth 0 unchanged; existing registry logic defaults it to 3. A nonzero value
42 remains 42. No new range policy was imposed.

## Executed verification

Commands run from the repository root unless otherwise noted. Complete outputs,
including intermediate failures, initial Git state and manifest delta, are
retained in the originating thread's `mdt258-23` artifact directory
(@thread:thr_th9wcumd8s); temporary working copies used `/tmp/mdt258-23`.

| Command | Result |
| --- | --- |
| `bun run --cwd domain-contracts build` | PASS, exit 0; strict equality and migration checks included. |
| `bun test ./domain-contracts/src` | PASS, exit 0: **373 tests / 25 files / 869 assertions**, versus baseline 349. |
| `bun run --cwd server jest --runInBand ProjectController Phase23 DevLogBatch parseRequest public-sharing read-token-management pins document-favs selector auth-session auth-stress-matrix config-api config-owner-only config-maintenance-policy devtools-security ConfigApplicationService StorageAdapters --forceExit` | PASS, exit 0: **205 tests / 20 suites**, no skips. |
| `bun run --cwd server jest --runInBand api-auth --forceExit` | PASS, exit 0: **22 tests / 1 suite** in isolation. See flake below. |
| `CONFIG_DIR=<isolated temporary directory> bun run --cwd shared test --runInBand project-write ProjectConfigService ProjectDocumentPatch configureDocumentsByPath ProjectService.resolve ProjectService.list project-creation configuration-validation ticketsPath-validation` | PASS, exit 0: **104 tests / 10 suites**, no skips; includes pretest build and real CLI creation. |
| `bun run --cwd shared build` | PASS, exit 0. |
| `bun run --cwd server build` | PASS, exit 0. |
| `bun run --cwd mcp-server build` | PASS, exit 0; no MCP source changes. |
| `bun run --cwd cloud build` and `bun run --cwd cli build` | PASS, exit 0 for each. |
| `bun run validate:ts:all` | Expected baseline failure, exit 1: **5 packages pass**, frontend fails at test-setup TS2306 and TS2322. |
| `bun run check:boundaries` | PASS, exit 0: **209 identities / 220 occurrences / 23 decoder modules**. |
| `bun run test:boundaries` | PASS, exit 0: **35 tests / 46 assertions**. |
| `bunx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --types bun --esModuleInterop --skipLibCheck --strict scripts/check-boundary-validation.ts scripts/check-boundary-validation.test.ts` | PASS, exit 0. |
| Owning-package ESLint over every changed TypeScript file; root ESLint over checker files | PASS, zero warnings. Package lint runs from its package directory so relative overrides apply. |
| Markdownlint on this report and plan; scoped whitespace and staging checks | PASS. |

An expanded combined server run first passed **226 / 21** before the final helper
metadata test was added. A later run reported **226 passed / 1 failed**: the
existing `api-auth` latency test received 404 from GET `/api/config`. Its isolated
22-test rerun passed. The final 205-test focused lane above excludes that optional
flaky suite. This is the documented API/environment flake class, not a reason to
change auth policy. Unforced combined runs reported open handles; the final
server commands use `--forceExit`. No user servers were restarted.

## Acceptance evidence

| ID | Result and evidence |
| --- | --- |
| P2-A | PASS: pre-wiring adapter and real-manager fixtures; actual AP code/default docs/CRs generation; flags/paths/depth forwarding; boolean active rejects before resolution; sharing tests generate, retain and rotate random IDs while rejecting client IDs. |
| P2-B | PASS: temp-file tests cover malformed TOML and nested shapes across registry/local update, direct-path update, document patch, creation preflight, config storage and sharing. Both destination bytes and registry inventory remain unchanged. Successful writes preserve extension siblings and raw legacy values. |
| P2-C | PASS: config API tests retain selector/field metadata for missing, unknown, guarded and invalid-value requests, with issue paths. Existing application-service tests retain exposure and strict value rules. |
| P3-A | PASS: empty adapter fixtures plus existing real pins/favorites suites; known-project and eligible-tree rejection tested separately from schema rejection; malformed-state fallback readers unchanged and existing coverage passes. |
| P3-B | PASS: malformed token bodies produce structured 400 with no cookie or credential echo; incorrect/empty string credentials and rejected invites remain 401; read-only permissions remain 403 before malformed-body parsing. Existing public-sharing/auth suites pass. Nullable/omitted expiry, origin policy and bodyless invites/revokes retain behavior. |
| P3-C | PASS: complete-batch rejection leaves frontend buffers unchanged; isolated active DEV handler tests prove unchanged buffers and rate counts, valid empty/extended batches, and the existing 429 rate gate. Inactive mode remains 403. |
| R-A | PASS: manifest strictly shrinks, no new exceptions, existing surviving entries identical; checker rejects fake/shadowed schema imports, ignored safeParse and raw reuse. |
| R-B | PASS: all 17 newly recorded pre-wiring compatibility cases remain green. Existing behavior tests retained. |

## Manifest delta

**254 → 209 identities; 265 → 220 occurrences.** Deleted exactly **45** existing
entries: 27 request reads, 3 request delegations, 8 decoder calls and 7 decoder
casts. **Zero additions, zero altered surviving exceptions.** Decoder-module
registrations remain 23; three descriptions/fixture owners now distinguish
validated writes from remaining Phase 4 readers/collision scans.

## Adaptations, review and Phase 4+ handoff

1. The checker originally counted every registered decoder call even inside a
   throwing schema parse. Added narrow recognition of the three canonically
   imported write-file schemas, with five rejection/acceptance fixtures. This
   enables deletion of migrated decoder exceptions without broadening exemptions.
2. Added creation preflight through ProjectConfigService/ProjectService/manager,
   beyond the five explicitly listed reload rows: otherwise registration could
   precede failure on the existing local file. This adds one bounded preflight
   reload; normal persistence still reloads before writing. Missing-registry
   fallback now applies only to the actual missing-registry error, so corruption
   cannot trigger a local write. This is shape-failure protection, not a general
   multi-file transaction or concurrency guarantee.
3. Project config storage validates write reloads while keeping its legacy display
   reader. Sharing creates a missing registry as before, but never replaces a
   corrupt destination with fallback data. Other file readers, global/user
   adapters, collision scans and migration/default policies remain Phase 4.
4. REST-local credential/opaque-param projections compose contract primitives;
   server gains no runtime Zod import/dependency. Pure request/log schemas live
   under domain-contracts input modules. No MDT-259 compatibility shim changed.
5. Three old mocked loader tests asserted mutation of the decoder's object
   identity. They now assert the actual serialized write with the same expected
   values, because Zod parsing returns a copy. No behavior assertion was removed.
6. DEV mode has no production activator. Its active branch is tested by compiling
   the actual route source into an isolated VM and appending only a test setter;
   the production API remains unchanged. Ordinary routes are also tested directly.
7. Self-review rechecked config-spec/global-config-spec and server architecture
   ownership/security claims against the complete patch: normative documentation
   impact remains NONE. Ticket/design/status untouched. Plan additions are the
   narrow checker recognition, manager/service preflight and mocked-output test
   adaptation described above. No performance improvement is claimed.
8. The first commit hook ran package ESLint configuration from the repository
   root, missing the existing `routes/devtools.ts` console exemption. Added the
   same file-local console policy to devtools, then reran the normal hook. No
   repository lint rule, boundary exception or hook was bypassed.

Phase 4 should reuse the compatible write schemas only after characterizing each
reader's normalization/fallback contract. Do not replace tolerant display readers
with strict entities, strip nested extensions, or simplify MDT-259 defaults.
Phase 5 still owns read envelopes, browser ingress and raw route-binding reads,
including document visibility and config project-selection helpers. MCP mutation
validation is unchanged; read tools remain deferred. No knip/ESLint adoption,
dependency change, ticket renumbering or status update is part of this work.

Unrelated initial worktree changes remain outside this commit. Final staged scope
contains only this plan/report, phase 2/3 schemas/adapters/write reloads, focused
tests and the shrinking boundary guard.
