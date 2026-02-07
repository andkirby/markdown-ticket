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
)
