import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Vrowser, VrowserManifest } from '@vrowser/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@sveltejs/vite-plugin-svelte', 'svelte']
  },
  plugins: [
    VrowserManifest(),
    svelte(),
    Vrowser({
      resolve: {
        alias: [
          { find: 'svelte/internal/client', replacement: '/vendor/svelte-internal-client.js' },
          { find: 'svelte', replacement: '/vendor/svelte.js' }
        ]
      }
    })
  ]
})
