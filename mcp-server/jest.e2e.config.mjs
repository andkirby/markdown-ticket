import path from 'path';

export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs'],
  verbose: false,
  silent: false,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.e2e.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@mdt/shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    '^shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    '^shared/(.*)$': '<rootDir>/../shared/dist/$1'
  },
  reporters: ['default']
};