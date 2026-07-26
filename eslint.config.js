import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: [
    'tsconfig.json',
    '**/*.toml',
    '**/*.yaml',
    '**/*.yml',
  ],
}).override('antfu/perfectionist/setup', (config) => {
  const [severity, options] = config.rules['perfectionist/sort-imports']
  return {
    ...config,
    rules: {
      ...config.rules,
      'perfectionist/sort-imports': [severity, {
        ...options,
        // Keep the existing import order whether ESLint runs under Node or Bun.
        customGroups: [{ groupName: 'external', elementNamePattern: '^bun(?::|$)', modifiers: ['value'] }],
      }],
    },
  }
})
