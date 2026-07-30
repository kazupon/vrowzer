import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [VrowzerManifest(), Vrowzer({ auto: false })],
  html: {
    additionalAssetSources: {
      'vrowzer-asset': {
        srcAttributes: ['data-src'],
        filter: ({ attributes }) => attributes['data-rewrite'] === 'true'
      }
    }
  },
  define: {
    __EXP__: 'false',
    __STRING__: '"hello"',
    __NUMBER__: 123,
    __BOOLEAN__: true,
    __UNDEFINED__: undefined,
    __OBJ__: {
      foo: 1,
      bar: {
        baz: 2
      },
      process: {
        env: {
          SOMEVAR: '"PROCESS MAY BE PROPERTY"'
        }
      }
    },
    'process.env.NODE_ENV': '"dev"',
    'process.env.SOMEVAR': '"SOMEVAR"',
    'process.env': {
      NODE_ENV: 'dev',
      SOMEVAR: 'SOMEVAR',
      OTHER: 'works'
    },
    $DOLLAR: 456,
    ÖUNICODE_LETTERɵ: 789,
    __VAR_NAME__: false,
    __STRINGIFIED_OBJ__: JSON.stringify({ foo: true }),
    __DEFINE_IN_ENVIRONMENT__: '"defined in environment"'
    // 'import.meta.env.SOME_IDENTIFIER': '__VITE_SOME_IDENTIFIER__'
    // Disabled: This define value references a runtime global (__VITE_SOME_IDENTIFIER__)
    // that is injected via <script> in the fixture HTML. However, vrowzer's extractWorkerConfig
    // forwards all define values to the Worker's internal Vite config, where
    // __VITE_SOME_IDENTIFIER__ is not defined, causing a ReferenceError during Worker startup.
  }
})
