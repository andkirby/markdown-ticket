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
      'jsdoc/check-param-names': 'off',
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
