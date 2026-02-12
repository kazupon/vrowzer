import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), ServiceWorker({ serviceWorkerAllowed: '/' })],
  define: {
    'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
  resolve: {
    alias: {
      'node:path': 'pathe',
      path: 'pathe',
      'node:fs': '@vrowser/fs',
      'node:fs/promises': '@vrowser/fs/promises',
      fs: '@vrowser/fs',
      'fs/promises': '@vrowser/fs/promises',
      'node:url': '@kazupon/jts-utils/url',
      url: '@kazupon/jts-utils/url'
    }
  },
  preview: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
})
