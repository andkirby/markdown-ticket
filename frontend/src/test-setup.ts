/**
 * Bun test setup for DOM environment
 *
 * This file sets up happy-dom for React component tests.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import '@testing-library/jest-dom'

// Initialize happy-dom for React component tests
// eslint-disable-next-line antfu/no-top-level-await
await GlobalRegistrator.register()
