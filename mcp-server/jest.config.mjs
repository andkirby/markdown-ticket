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
      tsconfig: (filename) => {
        // Use tsconfig.test.json for files in tests/ directory
        if (filename.includes('/tests/')) {
          return 'tsconfig.test.json'
        }
        return 'tsconfig.json'
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(supertest|@modelcontextprotocol|@mdt/shared|@mdt/domain-contracts))',
  ],
  moduleNameMapper: {
    // Map local .js imports to .ts files for Jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map @mdt/domain-contracts to the actual source directory
    '^@mdt/domain-contracts(.*)$': '<rootDir>/../domain-contracts/src$1',
    // Map @mdt/shared services to a mock implementation
    '^@mdt/shared/services/MarkdownService$': '<rootDir>/src/__mocks__/@mdt/shared/services/MarkdownService.ts',
    '^@mdt/shared/services/MarkdownService.js$': '<rootDir>/src/__mocks__/@mdt/shared/services/MarkdownService.ts',
    '^@mdt/shared/services/TitleExtractionService$': '<rootDir>/src/__mocks__/@mdt/shared/services/TitleExtractionService.ts',
    '^@mdt/shared/services/TitleExtractionService.js$': '<rootDir>/src/__mocks__/@mdt/shared/services/TitleExtractionService.ts',
    '^@mdt/shared/services/TemplateService$': '<rootDir>/src/__mocks__/@mdt/shared/services/TemplateService.ts',
    '^@mdt/shared/services/TemplateService.js$': '<rootDir>/src/__mocks__/@mdt/shared/services/TemplateService.ts',
    '^@mdt/shared/services/MarkdownSectionService$': '<rootDir>/src/__mocks__/@mdt/shared/services/MarkdownSectionService.ts',
    '^@mdt/shared/services/MarkdownSectionService.js$': '<rootDir>/src/__mocks__/@mdt/shared/services/MarkdownSectionService.ts',
    // Map test-lib to the actual test-lib directory
    '^@mdt/shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    '^shared/test-lib(.*)$': '<rootDir>/../shared/test-lib$1',
    // Other @mdt/shared modules to dist (for non-test files)
    '^@mdt/shared/(.*)$': '<rootDir>/../shared/dist/$1',
    '^shared/(.*)$': '<rootDir>/../shared/dist/$1',
  },
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  reporters: ['default'],
  testTimeout: 30000,
}
