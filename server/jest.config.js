/** @type {import('jest').Config} */
export default {
  resolver: '<rootDir>/jest-resolver.cjs',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    '**/controllers/**/*.ts',
    '**/services/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/utils/setupTests.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Map shared modules to mocks, removing .js extension
    '^@mdt/shared/(.*)\\.js$': '<rootDir>/tests/mocks/shared/$1',
    '^@mdt/shared/(.*)$': '<rootDir>/tests/mocks/shared/$1'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@mdt/shared/dist))'
  ],
  testTimeout: 10000
};