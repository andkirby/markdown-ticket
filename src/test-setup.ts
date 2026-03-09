/**
 * Bun test setup for DOM environment
 *
 * This file sets up happy-dom for React component tests.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import '@testing-library/jest-dom'

// Initialize happy-dom for React component tests
await GlobalRegistrator.register()
