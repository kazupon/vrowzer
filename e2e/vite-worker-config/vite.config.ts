import react from '@vitejs/plugin-react'
import { Vrowzer, VrowzerManifest } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite-plus'

export default defineConfig(() => ({
  define: { __HOST_ONLY__: JSON.stringify('host define') },
  server: { forwardConsole: true },
  optimizeDeps: { exclude: ['@sveltejs/vite-plugin-svelte', 'svelte'] },
  plugins: [
    react(),
    { name: 'host-only-marker' },
    VrowzerManifest(),
    Vrowzer({
      auto: false,
      extract: false,
      workerConfig: './vrowzer.worker.config.ts',
      basePath: '/worker-preview/'
    })
  ]
}))
