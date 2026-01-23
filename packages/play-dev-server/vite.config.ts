import vue from '@vitejs/plugin-vue'
import ServiceWorker from '@vrowser/unplugin-service-worker/vite'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), ServiceWorker({ serviceWorkerAllowed: '/' })],
  build: {
    rollupOptions: {
      input: {
        main: path.join(process.cwd(), 'index.html'),
        preview: path.join(process.cwd(), 'src/preview/index.html')
      }
    }
  }
})
