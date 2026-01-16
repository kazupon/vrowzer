import {
  comments,
  defineConfig,
  jsonc,
  markdown,
  oxlint,
  // jsdoc,
  typescript,
  yaml
} from '@kazupon/eslint-config'

const config: ReturnType<typeof defineConfig> = defineConfig(
  comments({ kazupon: false }),
  typescript({
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
      project: ['./tsconfig.json', './packages/*/tsconfig.json']
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
    presets: ['typescript'],
    configFile: './.oxlintrc.json'
  }),
  {
    ignores: [
      // FIXME: Fix lint errors in e2e tests, why they are ignored via eslint-plugin-oxlint?
      'packages/unplugin-service-worker/e2e/**',
      'packages/service-worker/e2e/**'
    ]
  }
)

export default config
