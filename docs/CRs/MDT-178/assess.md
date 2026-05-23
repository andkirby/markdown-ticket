# Assessment: MDT-178

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- One typed backend runtime configuration object built from env at startup.
- `PUBLIC_ORIGIN` as the only configured deployment origin for browser API access and generated links.

### Current System Assumptions
- Routes and security helpers can read `process.env` directly.
- Current request origin is a sufficient default for invite/share links.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Config parsing is spread across route and security helpers. |
| Extension Fit | Concerning | Public link origin selection needs its own boundary, not route-local parsing. |
| Dependency Fit | Healthy | No new packages are required. |
| Verification Fit | Concerning | Existing tests cover sharing and origins but not a startup config boundary. |
| Redesign Scope | Concerning | The redesign is bounded to server config, origin policy, auth/share/read-token routes, and tests. |

## Mismatch Points

### Runtime Configuration Boundary
- Current system assumes: each module can read its required env vars.
- Feature needs: env parsed once into a typed `RuntimeConfig`.
- Mismatch: request-time env reads make deployment behavior depend on when tests or routes mutate globals.
- Adjustment required: add `server/config/runtimeConfig.ts`, store config on `app.locals.runtimeConfig`, and pass derived policy/config to route wiring.
- Scope: bounded

### Public Link Origin Selection
- Current system assumes: current origin is enough for link generation.
- Feature needs: `PUBLIC_ORIGIN` wins and current origin remains safe fallback only when no configured origin exists.
- Mismatch: generated links can default to localhost despite configured deployment domains.
- Adjustment required: make origin parsing pure and select public link origins from runtime config, not direct env reads.
- Scope: local

### Owner Sharing UI
- Current system assumes: a single `linkOrigin` is enough.
- Feature needs: server-owned public-origin decisions.
- Mismatch: UI must not synthesize origin options from browser state.
- Adjustment required: include origin options in read-token list response and use selected origin for invite/share link generation.
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: new `RuntimeConfig` boundary and startup wiring
- Testing/E2E impact: add server config tests and extend sharing E2E for configured public origin behavior
- Main risk introduced: route factories created before config injection could keep stale env-derived defaults

## Verification Gaps

- Preservation tests needed: origin policy scope and read-token invite origin tests
- E2E/contract drift risks: selector names and sharing settings flow
- Safe-to-refactor now?: yes, with focused Jest and Playwright coverage

## Recommendation

### Option 1: Integrate As-Is
Use when: direct env reads could stay local.
Architecture impact: insufficient because this CR explicitly requires a boundary.

### Option 2: Redesign Inline
Use when: the mismatch is real but contained.
Architecture must redesign: server runtime config parsing, origin policy inputs, auth/share/read-token route config access.
Expected scope added: focused test-app factory and E2E fixture support for app-local runtime config overrides.

### Option 3: Redesign First
Use when: project registry or broader auth architecture must be replaced first.
Reason redesign cannot wait: not applicable.
Preferred path: same CR, no prep phase.
