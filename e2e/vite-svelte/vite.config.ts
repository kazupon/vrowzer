import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@sveltejs/vite-plugin-svelte', 'svelte']
  },
  plugins: [VrowzerManifest(), svelte(), Vrowzer({ auto: false })]
})
