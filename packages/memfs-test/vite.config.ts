import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'node:fs/promises': path.resolve(import.meta.dirname, 'src/fs.ts'),
      'memfs-browser': path.resolve(
        import.meta.dirname,
        './node_modules/memfs-browser/dist/memfs.esm.js'
      ),
      'node:buffer': path.resolve(import.meta.dirname, './node_modules/buffer/index.js'),
      buffer: path.resolve(import.meta.dirname, './node_modules/buffer/index.js')
    }
  }
})
