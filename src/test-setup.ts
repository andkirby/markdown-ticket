// Test setup for frontend tests
import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder in Jest (Node 18+)
if (typeof TextEncoder === 'undefined') {
  // eslint-disable-next-line ts/no-require-imports -- Node.js polyfill
  const { TextEncoder: TE, TextDecoder: TD } = require('node:util')
  // eslint-disable-next-line no-restricted-globals -- Node.js polyfill
  global.TextEncoder = TE
  // eslint-disable-next-line no-restricted-globals -- Node.js polyfill
  global.TextDecoder = TD
}
