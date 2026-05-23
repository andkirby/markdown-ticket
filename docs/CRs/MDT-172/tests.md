# Tests: MDT-172

## Module to Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| API sharing/access layer | `server/tests/api/public-sharing.test.ts` | anonymous project filtering, unlisted share session, read token scope, read-only mutation denial, owner sharing update |
| Frontend read-only controls | `src/components/ReadOnlyMode.test.tsx` | board/list/documents controls unavailable in read-only state |
| SSE scope filter | `server/tests/api/public-sharing.test.ts` | read-only clients receive only visible project events |
| System/config route access | `server/tests/api/public-sharing.test.ts` | read-only callers cannot access filesystem/config/cache mutation surfaces |
| One-time code cleanup | `tests/e2e/public-sharing.spec.ts` | POST exchange removes code from browser URL |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `server/tests/api/public-sharing.test.ts` | share IDs use non-project opaque format and accepted character/length constraints |
| C2 | `server/tests/api/public-sharing.test.ts` | raw secrets, cookies, authorization headers, tokens, and codes are not emitted in responses |
| C3 | `server/tests/api/public-sharing.test.ts`, `tests/e2e/public-sharing.spec.ts` | owner/admin tokens stay out of URLs and browser-readable storage; one-time codes are removed |
| C4 | `server/tests/api/public-sharing.test.ts`, `src/components/ReadOnlyMode.test.tsx` | backend 403 gate plus UI control removal |
| C5 | `server/tests/api/public-sharing.test.ts` | SSE event scope filtering |
| C6 | `server/tests/api/public-sharing.test.ts` | sharing does not widen CORS/Origin behavior |
| C7 | `server/tests/api/public-sharing.test.ts` | cookie-backed owner/admin mutations require existing owner intent and Origin checks |
| C8 | `server/tests/api/public-sharing.test.ts` | invalid token/code exchange returns generic denial |

## Verify

```bash
bun run --cwd server jest server/tests/api/public-sharing.test.ts
bun test src/components/ReadOnlyMode.test.tsx
bunx playwright test tests/e2e/public-sharing.spec.ts --project=chromium
```

## Trace

- Tests trace projection: [tests.trace.md](./tests.trace.md)
