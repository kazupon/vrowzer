import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'

import type { Plugin } from 'vite-plus'

function hostOnlyMarkerPlugin(): Plugin {
  return {
    name: 'host-only-marker',
    transform(code, id) {
      if (id.split('?')[0]?.endsWith('/extract-marker.js')) {
        return {
          code: code.replace('__EXTRACT_PLUGIN_MARKER__', 'host-plugin-applied'),
          map: null
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [
    hostOnlyMarkerPlugin(),
    Vrowzer({
      auto: false,
      extract: false,
      resolve: {
        alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }]
      }
    })
  ]
})
