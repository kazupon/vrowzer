import { defineConfig } from '@vrowser/vite-plugin/config'

import type { Plugin } from 'vite'

function testPlugin(): Plugin {
  return {
    name: 'vrowser-test-plugin',
    configResolved() {
      console.log('[vrowser-test-plugin] configResolved: plugin loaded successfully!')
    },
    transform(code, id) {
      if (id.endsWith('.ts') && !id.includes('node_modules')) {
        console.log(`[vrowser-test-plugin] transform: ${id}`)
      }
    }
  }
}

export default defineConfig({
  plugins: [testPlugin()]
})
