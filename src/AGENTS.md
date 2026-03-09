# Frontend Conventions

## Testing

- Keep frontend unit and light integration tests colocated in `src/` as `*.test.ts` or `*.test.tsx`.
- Use `tests/e2e/**/*.spec.ts` for Playwright end-to-end coverage.
- Do not use `src/**/__tests__` as the default structure. Bun works best with filename-based discovery, and this repo already follows colocated tests.
- Only introduce a local `__tests__` folder when one feature needs several tightly related test files plus shared fixtures and that structure is clearly cleaner.
