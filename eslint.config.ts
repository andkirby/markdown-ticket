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
      'src-tauri',
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

      // Disable overly strict rule about setState in useEffect - legitimate pattern for initialization
      'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',

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
      // Allow any in test mocks
      'ts/no-explicit-any': 'off',
    },
  },

  // MDT-258 blind-cast gate: typed-linting rule on server + mcp-server
  // production sources. Scoped off for tests (thousands of casts) and
  // out-of-project config files; pre-existing casts carry a line-1 file
  // baseline marker. Mirrored in server/eslint.config.ts and
  // mcp-server/eslint.config.ts so per-package lint and the lefthook
  // eslint-staged (root config) agree.
  {
    files: [
      'server/server.ts',
      'server/services/**/*.ts',
      'server/controllers/**/*.ts',
      'server/routes/**/*.ts',
      'server/strategies/**/*.ts',
      'server/utils/**/*.ts',
      'server/repositories/**/*.ts',
      'server/factories/**/*.ts',
      'server/commands/**/*.ts',
      'server/invokers/**/*.ts',
      'server/middleware/**/*.ts',
      'server/openapi/**/*.ts',
      'server/scripts/**/*.ts',
      'server/mcp-dev-tools/health-check.ts',
      'server/mcp-dev-tools/src/**/*.ts',
      'mcp-server/src/**/*.ts',
    ],
    ignores: [
      'server/tests/**',
      'server/**/__tests__/**',
      'server/**/*.test.ts',
      'server/**/*.spec.ts',
      'mcp-server/src/**/__tests__/**',
      'mcp-server/src/**/*.test.ts',
      'mcp-server/src/**/*.spec.ts',
      'mcp-server/src/**/*.config.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['server/mcp-dev-tools/health-check.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'ts/no-unsafe-type-assertion': 'error',
    },
  },
)
