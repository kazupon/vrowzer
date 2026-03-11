import { resolve } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@sveltejs/vite-plugin-svelte', 'svelte']
  },
  plugins: [
    svelte(),
    VrowserManifest(),
    Vrowser({
      serviceWorkerEntry: resolve(
        import.meta.dirname,
        '../../../packages/vrowser/dist/service-worker.ts'
      ),
      resolve: {
        alias: [
          { find: 'svelte/internal/client', replacement: '/vendor/svelte-internal-client.js' },
          { find: 'svelte', replacement: '/vendor/svelte.js' }
        ]
      }
    })
  ]
})
