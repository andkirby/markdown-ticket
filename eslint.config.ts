import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    react: true,
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '**/*.md',
      '.gitWT',
      'tests',
      '--',
      'docker-config',
      'docs/CRs',
      'docs/archive',
      '.gitWT',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Disable storybook rules as @antfu/eslint-config doesn't include them
      // Re-enable if needed via eslint-plugin-storybook
      '@typescript-eslint/no-explicit-any': 'warn',

      // Disable react/no-implicit-key as it requires full type info that isn't available
      'react/no-implicit-key': 'off',

      // Block relative imports to shared module - use @mdt/shared path alias instead
      // This is required because TypeScript project references expect imports from
      // built output (../shared/dist/*), not source files (../shared/*)
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['../shared/**', '../../shared/**', '../../../shared/**', '../../../../shared/**'],
            message: 'Use "@mdt/shared" path alias instead of relative imports to shared module. This breaks TypeScript project references.',
          }],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      // Allow uppercase for Gherkin-style test patterns (GIVEN/WHEN/THEN)
      'test/prefer-lowercase-title': 'off',
    },
  },
)
