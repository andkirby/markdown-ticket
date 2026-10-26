---
code: MDT-260
status: Implemented
dateCreated: 2026-10-24T00:00:00.000Z
type: Technical Debt
priority: Medium
phaseEpic: MDT-233
---

# Baseline shrink-down: boundary manifest, eslint casts, knip ignores

> The MDT-258 enforcement system runs on three shrink-only baselines. This ticket is their forcing function: without an owner, they rot.

## 1. Problem

Three baselines were introduced to gate drift without blocking on pre-existing debt:

| Baseline | Introduced | Current size |
|---|---|---|
| Boundary legacy manifest (`scripts/boundary-validation-legacy.json`) | MDT-258 phase 0 (`802c074d`) | 152 identities / 160 occurrences |
| eslint cast baseline (`ts/no-unsafe-type-assertion` file-level disables) | MDT-258 leftovers (`89c73cde`) | 37 files / 149 casts |
| knip `ignoreIssues` (`server/**`, `cli/**`, `cloud/**` exports+types; shared strict-lens entry exports) | MDT-258 leftovers (`c4ec4a76`, `da001cba`) | per-directory globs |

Each is designed to only shrink, but nothing forces it. Ticket owner: every PR that touches a baselined site deletes its entry in the same change.

## 2. Work items

1. **Manifest (152 → target ≤100)**: highest-value identities first — Express `D`-class reads (params/query) in `ProjectController`/`DocumentController`; each migrated site gets `parseRequest` + schema per the MDT-258 patterns, then its manifest entries deleted. Decoder entries shrink as loaders adopt persisted schemas.
2. **eslint casts (37 files → target ≤20)**: burn down per file — remove the file-level disable only when the whole file is cast-clean. Server `security/**` and `transports/http.ts` have the densest clusters; many are `as Error`/`as Record<string,unknown>` narrowing that type guards or `unknown`-safe access fixes cleanly.
3. **knip ignores**: coordinate with the parallel stream — `server/services/config/types.ts` entries belong to MDT-255; do not delete exports another ticket owns. Burn down only verified-dead entries; each deletion shrinks the glob or converts it to per-file entries.
4. **Rule of the ticket**: a PR may touch a baselined site only if the matching baseline entry is removed in the same change. Never regenerate baselines; never add entries (expansion = explicit review, per MDT-258 §D).

## 3. Acceptance criteria

- [x] Boundary manifest ≤100 identities with no behavior change (compat tests per migrated site)
- [x] eslint baseline ≤20 files; `lint:server` + `lint:mcp` exit 0 throughout
- [x] knip: at least the `cloud/**` and `cli/**` globs converted to per-file entries or removed; `bun run knip` exit 0
- [x] `bun run check:boundaries` + `test:boundaries` green throughout; no baseline grows at any commit

## 4. Out of scope

- Frontend test debt (`test-setup.ts`, `__tests__` lint) — parallel stream owns
- New boundary types or schema policy (MDT-258 patterns are fixed)
- shared strict-knip entry exports consumed by server/cli tests (needs those workspaces' lenses; follow-up)

## 5. Verification

Implemented across 8 commits (see [result.md](MDT-260/result.md) for the monotonic shrink table). All ACs beaten: manifest 152 → **80** (premise outdated — phase 5 had migrated the reads; shrink came from behavior-preserving request-decouplings), eslint baseline 37 → **17 files**, knip cloud/cli globs → **per-file entries** (+ real cloud entry found). Parent-thread verified in a clean-checkout worktree: checker 80 identities green, test:boundaries 46/46, knip exit 0, lint:server + lint:mcp exit 0, domain 368.

Handoff: parallel stream's uncommitted `acquireLock`→`withLock` restructure will need a 2-entry manifest sync when it lands (noted in result). Interleaved fix `42d3a94c` repaired their MDT-262 DSH plugin drift that broke gates mid-flight.

### Follow-up 2026-10-26

The previously unstaged command return types, invoker narrowing and runtime
config guard are grouped as one typing-cleanup follow-up. The actual committed
marker count before it was 18; removing runtimeConfig's exemption makes the
reported 17 accurate. See [result.md](MDT-260/result.md) for validation and the
separately identified CLI export regression.
