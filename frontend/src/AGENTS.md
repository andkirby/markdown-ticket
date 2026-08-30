# Frontend Conventions

## Route architecture — where new code goes

Canonical model: `docs/architecture/frontend-routes-architecture.md` (hook
contracts, invariants, history). The operating rules:

- `frontend/src/App.tsx` is a route table ONLY (providers + `<Routes>`). Never add state,
  effects, or feature code there. Route paths come from `frontend/src/routes.ts`
  constants — never inline strings.
- Route handlers live in `frontend/src/components/routes/`. The project route
  (`ProjectRouteHandler.tsx`) is a composition shell: it calls the four
  route hooks and renders — it is not a place to accrete `useState` for a
  concern that has a home.
- One concern, one hook in `routes/hooks/` (+ colocated test): `useAuthGate`
  (unlock/lock, owner unlock), `useProjectRouteValidation` (route error),
  `useViewModeRouting` (view persistence — the ONLY writer of
  `lastViewMode` / `lastBoardListMode` / `mdt-board-mode` / Default View),
  `useTicketModalRoute` (ticket modal from URL).
- Effect order is load-bearing: `useAuthGate → useProjectRouteValidation →
  useViewModeRouting → useTicketModalRoute`. When moving effects, bodies and
  dep arrays move verbatim; hooks never import the shell or each other.
- Overlays are props-only in `routes/ProjectOverlays.tsx`; modal UI follows
  `frontend/src/MODALS.md`; register new `data-testid`s in
  `tests/e2e/utils/selectors.ts` (E2E selectors are contracts — preserve them
  on moves).
- Metric gate: no file under `frontend/src/` may enter the `ts-metrics` red zone
  (`.ts-metrics.rc`). Run `ts-metrics --red src` before committing structural
  change; extraction relocates complexity, it does not delete it.

## Testing

- Keep frontend unit and light integration tests colocated in `frontend/src/` as `*.test.ts` or `*.test.tsx`.
- Use `tests/e2e/**/*.spec.ts` for Playwright end-to-end coverage.
- Do not use `frontend/src/**/__tests__` as the default structure. Bun works best with filename-based discovery, and this repo already follows colocated tests.
- Only introduce a local `__tests__` folder when one feature needs several tightly related test files plus shared fixtures and that structure is clearly cleaner.
- Use `bun run fe:test` for frontend unit tests (`bun test --isolate ./frontend/src`; running without `--isolate` produces cross-file pollution failures).
