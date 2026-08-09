# PinStateService Bypasses the Runtime-Config Env Boundary (MDT-178)

**Date:** 2026-08-09
**Severity:** Low
**Status:** Open
**Affected:** `server/services/PinStateService.ts`; the MDT-178 runtime-config architectural boundary

## Symptoms

`server/tests/config/runtimeConfig.test.ts` — one of eight tests fails:

```text
✕ keeps direct process.env reads inside startup and runtime config boundaries (16 ms)
  expect(offenders).toEqual([])
    Expected: []
    Received: ["services/PinStateService.ts"]
```

Fails in isolation (not an ordering/isolation issue).

## Impact

Low, but real. The MDT-178 invariant is that server production code reads environment configuration **only** through `buildRuntimeConfig()` (captured once at startup) or the allowed legacy consumers — never `process.env` / `getConfigDir()` directly at runtime. `PinStateService` violates this: it resolves its pins file via `getConfigDir()` at call time (`services/PinStateService.ts:98`), reading `process.env.CONFIG_DIR` outside the sanctioned boundary.

Practical consequence: the pins file location is re-derived from live env on every access rather than from the app's startup-captured runtime config. If `CONFIG_DIR` were ever mutated at runtime (e.g. test reuse, a future hot-reload path), pin state would silently point at a different file than the rest of the app. It also leaves the boundary-guard test red, masking future regressions (a new offender would hide behind the existing failure).

## Confirmed Cause

`server/services/PinStateService.ts`:

```ts
// line 11
import { getConfigDir } from '@mdt/shared/utils/constants.js'
// line 98
return path.join(getConfigDir(), 'pins.json')
```

The guard (`hasRuntimeConfigBypass` in `tests/config/runtimeConfig.test.ts`) flags both `process.env` and `getConfigDir(`. `PinStateService` is not in the legacy-consumer allowlist (`isLegacyConfigDirConsumer` covers only `DocumentFavStateService.ts` and `fileWatcher/PathWatcherService.ts`).

## Reproduction

```bash
cd server
npx jest tests/config/runtimeConfig.test.ts
# → 1 failed, 7 passed
```

Offender scan (mirrors the test's logic):

```text
OFFENDERS (1):
  services/PinStateService.ts
```

## Verification this is pre-existing

Fails on `main` identically (confirmed by stashing branch changes). Single offender; the test is a guard, not the defect.

## Follow-up

- Preferred: thread the app-local runtime config (`app.locals.runtimeConfig.configDir`) into `PinStateService` the same way the allowed consumers receive their config dir, and read from that instead of `getConfigDir()`.
- Minimal/interim: if `PinStateService` legitimately cannot be wired with runtime config yet, add it to `isLegacyConfigDirConsumer` with a comment explaining why — but that widens the boundary rather than fixing it.
- Either way, the eight-test suite should go green so the guard can catch the *next* bypass.
