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
      'test-lib/README.md',
      'test-lib/write-tests-guide.md',
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
    },
  },
)
