import { defineConfig } from '@vrowser/vite-plugin/config'
import yaml from '@rollup/plugin-yaml'

export default defineConfig({
  plugins: [yaml()]
})
