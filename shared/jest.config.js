/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  // Force exit for integration tests that spawn external processes
  // The "Jest did not exit" warning is a false positive when using tree-kill
  forceExit: true,
  collectCoverageFrom: [
    '**/test-lib/**/*.ts',
    '**/tools/**/*.ts',
    '**/services/**/*.ts',
    '**/models/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map workspace dependencies to their source paths for Jest
    '^@mdt/domain-contracts$': '<rootDir>/../domain-contracts/src/index.ts'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true
        }
      }
    ]
  },
  testTimeout: 30000,
  verbose: true
};
