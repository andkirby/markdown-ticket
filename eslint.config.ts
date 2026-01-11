import { sheriff, type SheriffSettings } from 'eslint-config-sheriff';

const sheriffOptions: SheriffSettings = {
  react: true,
  lodash: false,
  remeda: false,
  next: false,
  astro: false,
  playwright: false,
  storybook: true,
  jest: true,
  vitest: false,
  tsconfigRootDir: import.meta.dirname
};

const baseConfig = sheriff(sheriffOptions);

// Block relative imports to shared module - use @mdt/shared path alias instead
// This is required because TypeScript project references expect imports from
// built output (../shared/dist/*), not source files (../shared/*)
const customConfig = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [{
          group: ['../shared/**', '../../shared/**', '../../../shared/**', '../../../../shared/**'],
          message: 'Use "@mdt/shared" path alias instead of relative imports to shared module. This breaks TypeScript project references.'
        }]
      }
    ]
  }
};

export default [
  ...baseConfig,
  customConfig
];