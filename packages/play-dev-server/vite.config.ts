import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), ServiceWorker({ serviceWorkerAllowed: '/' })],
  define: {
    'import.meta.env.DEBUG': JSON.stringify(process.env.DEBUG || '')
  },
  preview: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
})
