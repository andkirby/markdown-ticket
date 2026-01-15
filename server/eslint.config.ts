import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    test: true,
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'docs/**/*.md',
    ],
  },
  {
    rules: {
      // Test file overrides - disable rules that cause issues in test files
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
