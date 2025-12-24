import { defineConfig } from 'eslint/config';
import { sheriff, type SheriffSettings } from 'eslint-config-sheriff';

const sheriffOptions: SheriffSettings = {
  "react": true,
  "lodash": false,
  "remeda": false,
  "next": false,
  "astro": false,
  "playwright": false,
  "storybook": true,
  "jest": false,
  "vitest": false,
  "tsconfigRootDir": import.meta.dirname
};

export default defineConfig(sheriff(sheriffOptions));