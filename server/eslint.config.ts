import { sheriff, type SheriffSettings } from 'eslint-config-sheriff';

const sheriffOptions: SheriffSettings = {
  react: false,
  lodash: false,
  remeda: false,
  next: false,
  astro: false,
  playwright: false,
  storybook: false,
  jest: true,
  vitest: false,
  tsconfigRootDir: import.meta.dirname
};

export default sheriff(sheriffOptions);
