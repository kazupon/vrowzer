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
      // Generated Playwright CLI artifacts
      '**/.playwright-cli/**',
      // FIXME: Fix lint errors in e2e tests, why they are ignored via eslint-plugin-oxlint?
      'packages/unplugin-service-worker/integration/**',
      'packages/service-worker/**',
      'packages/safe-port/**',
      // ignores for vite-dev-server package, because it will be forked from `vite` and maintained separately, preventing conflicts.
      'packages/vite-dev-server/**',
      // ignores for service-worker-server package integration and test-public files
      'packages/service-worker-server/**',
      // ignores for fs package build files
      'packages/fs/**',
      // ignores for node-polyfill integration test files
      'packages/node-polyfill/integration/**',
      'packages/oxlint-plugin-service-worker/**',
      'packages/vite-plugin/**',
      'packages/vrowzer/**',
      'packages/rolldown/integration/**',
      'e2e/**'
    ]
  }
)

export default config
