export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/integration/'],
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  verbose: true,
  silent: false,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(supertest|@modelcontextprotocol|@mdt/shared))'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@mdt/shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    '^shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    '^@mdt/shared/(.*)$': '<rootDir>/../shared/dist/$1',
    '^shared/(.*)$': '<rootDir>/../shared/dist/$1'
  },
  setupFilesAfterEnv: [],
  reporters: ['default'],
  testTimeout: 30000
};