/**
 * Bun test setup for DOM environment
 *
 * This file sets up happy-dom for React component tests.
 *
 * Registration order matters: `@testing-library/dom` bakes its global `screen`
 * object at module-evaluation time (`typeof document === 'undefined'` at that
 * moment installs permanently throwing query helpers). Static imports are
 * hoisted, so importing `@testing-library/jest-dom` (which imports
 * `@testing-library/dom`) at the top of this file evaluates RTL-dom BEFORE
 * happy-dom registers `document` — poisoning `screen` for the entire process.
 * Register first (synchronous), then import jest-dom dynamically.
 *
 * Isolation contract (why this file owns globals): `bun test` executes every
 * test file in ONE process, in alphabetical order. Unlike Jest, bun does not
 * scope module mocks per file, does not inject `afterEach` as a global (so
 * @testing-library/react's auto-cleanup never activates), and nothing restores
 * `globalThis.fetch` between files. Without the bridges below, one file's DOM,
 * fetch mock, or module mock leaks into every later file.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterEach } from 'bun:test'

// Initialize happy-dom for React component tests.
// A real origin (the dev server's) so relative-URL code paths
// (`new URL(href, window.location.origin)`) resolve as in the browser
// instead of throwing on about:blank.
GlobalRegistrator.register({ url: 'http://localhost:3075/' })

// Must stay AFTER registration — see note above.
// eslint-disable-next-line antfu/no-top-level-await
await import('@testing-library/jest-dom')

// Bridge bun:test's afterEach onto globalThis BEFORE any test file imports
// @testing-library/react: RTL enables its automatic cleanup only when
// `afterEach` is a global (Jest injects it; bun does not). With this in
// place every `render()` unmounts after each test.
globalThis.afterEach = afterEach

// Quarantine the other two process-wide globals between tests:
// - document.body: removes non-RTL DOM a test appended directly
//   (e.g. MarkdownViewer's mermaid container).
// - globalThis.fetch: restores the pristine happy-dom implementation so a
//   file's fetch mock cannot leak into the next file. Test files that mock
//   fetch must (re)assign it in `beforeEach`, not at module top level.
const pristineFetch = globalThis.fetch

afterEach(() => {
  document.body.replaceChildren()
  globalThis.fetch = pristineFetch
})
