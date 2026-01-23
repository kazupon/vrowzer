import { defineConfig } from 'vite'

const config: ReturnType<typeof defineConfig> = defineConfig({
  root: '.',
  publicDir: 'test-public',
  server: {
    port: 5174
  }
})

export default config
