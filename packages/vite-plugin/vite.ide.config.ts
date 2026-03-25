import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  build: {
    lib: {
      entry: './src/ide/main.ts',
      formats: ['es'],
      fileName: 'ide'
    },
    outDir: 'dist/ide',
    emptyOutDir: true,
    cssCodeSplit: false,
    rolldownOptions: {
      external: ['vrowzer'],
      output: {
        assetFileNames: '[name][extname]'
      }
    }
  }
})
