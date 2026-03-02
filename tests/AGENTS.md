# AGENTS.md — Running E2E Tests

## Testing Strategy

Frontend testing uses **Playwright E2E exclusively**. No unit tests, integration
tests, or other E2E frameworks (Cypress, Selenium, Jest, Vitest, etc.) are
supported or should be introduced.

## Ports

| Service | Test | Dev |
|---------|------|-----|
| Frontend (Vite) | 6173 | 5173 |
| Backend (Express) | 4001 | 3001 |

Defined in `shared/test-lib/config/ports.ts` (MDT-092).
The Vite proxy routes all `/api` calls to the test backend via `VITE_BACKEND_URL=http://localhost:4001`.

## Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run a specific file (headless, no server restart)
PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/smoke/infrastructure.spec.ts --project=chromium

# Visible browser
npx playwright test tests/e2e/smoke/infrastructure.spec.ts --project=chromium --headed

# Interactive UI mode (timeline, selector picker, speed slider)
npx playwright test --ui
```

## Isolation

Each test run gets a fresh temp directory as `CONFIG_DIR` — only projects created during
that run are visible. Real user projects are never exposed to the test backend.

If tests see real projects, check that `VITE_BACKEND_URL` is set and the Vite proxy
in `vite.config.ts` uses it as the first priority.

## Writing tests

See `tests/e2e/AGENTS.md`.
