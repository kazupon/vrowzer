import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/url.ts',
    './src/util.ts',
    './src/events.ts',
    './src/perf_hooks.ts',
    './src/os.ts',
    './src/dns.ts',
    './src/dns_promises.ts',
    './src/process.ts',
    './src/readline.ts'
  ],
  platform: 'browser',
  clean: true,
  publint: true,
  dts: true
})
