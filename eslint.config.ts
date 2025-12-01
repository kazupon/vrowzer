import {
  comments,
  defineConfig,
  jsonc,
  markdown,
  oxlint,
  prettier,
  // jsdoc,
  typescript,
  yaml
} from '@kazupon/eslint-config'

const config: ReturnType<typeof defineConfig> = defineConfig(
  comments({
    kazupon: {
      ignores: [
        './**/test/**',
        './**/src/**/*.test.ts',
        './**/src/**/*.test-d.ts',
        './packages/playground/**/*.ts' // NOTE: Temporary ignore for monorepo packages
      ]
    }
  }),
  typescript({
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
      project: './tsconfig.json'
    }
  }),
  // NOTE: Temporarily disable jsdoc plugin
  // jsdoc({
  //   typescript: 'syntax',
  // }),
  jsonc({
    json: true,
    json5: true,
    jsonc: true,
    prettier: true
  }),
  yaml({
    prettier: true
  }),
  markdown({
    preferences: true
  }),
  oxlint({
    enableGlobalIgnore: true,
    presets: ['typescript'],
    configFile: './.oxlintrc.json'
  }),
  prettier()
)

export default config
