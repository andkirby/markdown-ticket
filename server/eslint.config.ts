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
      'ts/no-explicit-any': 'off',
    },
  },
  {
    files: [
      'tests/**/*.ts',
      'mcp-dev-tools/**/*.ts',
      'routes/devtools.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-console': 'off',
      'test/prefer-lowercase-title': 'off',
    },
  },
  // MDT-258 blind-cast gate on production sources. Tests are scoped off
  // (thousands of casts); pre-existing casts carry a line-1 file baseline
  // marker. Mirrors eslint.config.ts at the repo root (lefthook
  // eslint-staged) so both configs agree on the baseline.
  {
    files: ['**/*.ts'],
    ignores: [
      'tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      'eslint.config.ts',
      '**/*.config.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['mcp-dev-tools/health-check.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'ts/no-unsafe-type-assertion': 'error',
    },
  },
)
