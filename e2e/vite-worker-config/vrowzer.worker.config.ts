import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { compilerOptions, marker } from './preview/options.ts'

const plugins = svelte({ compilerOptions })

export default defineConfig({
  plugins: [
    ...plugins,
    {
      name: 'worker-config-assertions',
      configResolved(config) {
        if (
          config.plugins.some(
            plugin => plugin.name === 'host-only-marker' || plugin.name.startsWith('vite:react')
          )
        ) {
          throw new Error('Host plugins leaked into the preview')
        }
        if ('__HOST_ONLY__' in (config.define ?? {})) {
          throw new Error('Host define leaked into the preview')
        }
        if (config.server.forwardConsole.enabled !== false) {
          throw new Error('Worker server config was overwritten')
        }
      },
      configureServer(server) {
        for (const environment of Object.values(server.environments)) {
          if (environment.depsOptimizer !== undefined) {
            throw new Error(`Dependency optimizer was created in ${environment.name}`)
          }
        }
      }
    }
  ],
  define: { __PREVIEW_ONLY__: JSON.stringify(marker) },
  resolve: {
    alias: [{ find: 'preview-lib', replacement: '/vendor/preview-lib.js' }],
    dedupe: ['svelte']
  },
  server: { forwardConsole: false }
})
