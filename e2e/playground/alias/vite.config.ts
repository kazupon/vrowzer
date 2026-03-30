import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    VrowzerManifest(),
    Vrowzer({
      auto: false,
      resolve: {
        alias: [
          // alias 'fs' to a specific file
          { find: 'fs', replacement: '/test.js' },
          // alias to a directory
          { find: 'fs-dir', replacement: '/dir' },
          // alias for script src attribute
          { find: '/@', replacement: '/dir' },
          // alias to a module package
          { find: 'aliased-module', replacement: '/dir/module' },
          // custom-resolver: alias to customResolver.js
          { find: 'custom-resolver', replacement: '/customResolver.js' }
        ]
      }
      // NOTE: RegExp-based aliases (regex/*, //) are not supported because
      // VrowzerOptions.resolve is serialized via JSON.stringify to pass to the Worker,
      // and RegExp objects become {} when serialized.
    })
  ]
})
