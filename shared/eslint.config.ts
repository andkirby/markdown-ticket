import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  test: true,
  ignores: [
    'dist',
    'node_modules',
    'coverage',
  ],
})
