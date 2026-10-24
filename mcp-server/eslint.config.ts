import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    test: true,
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '**/*.md',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-console': 'off',
      'test/prefer-lowercase-title': 'off',
      // Allow any in test mocks (matches the server package convention)
      'ts/no-explicit-any': 'off',
    },
  },
  // MDT-258 blind-cast gate on production sources. Tests are scoped off
  // (thousands of casts); pre-existing casts carry a line-1 file baseline
  // marker. Mirrors eslint.config.ts at the repo root (lefthook
  // eslint-staged) so both configs agree on the baseline.
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'ts/no-unsafe-type-assertion': 'error',
    },
  },
)
