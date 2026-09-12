/**
 * Bun test setup for DOM environment
 *
 * This file sets up happy-dom for React component tests.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import '@testing-library/jest-dom'

// Initialize happy-dom for React component tests.
// A real origin (the dev server's) so relative-URL code paths
// (`new URL(href, window.location.origin)`) resolve as in the browser
// instead of throwing on about:blank.
// eslint-disable-next-line antfu/no-top-level-await
await GlobalRegistrator.register({ url: 'http://localhost:3075/' })
