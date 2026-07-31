import { describe, expect, test } from 'vite-plus/test'
import { extractWorkerConfig, isWorkerExcludedImport } from './extract.ts'

describe('isWorkerExcludedImport', () => {
  test('detects @vrowzer/vite-plugin', () => {
    expect(isWorkerExcludedImport('@vrowzer/vite-plugin')).toBe(true)
  })

  test('detects @vrowzer/vite-plugin/config', () => {
    expect(isWorkerExcludedImport('@vrowzer/vite-plugin/config')).toBe(true)
  })

  test('detects @vitejs/devtools', () => {
    expect(isWorkerExcludedImport('@vitejs/devtools')).toBe(true)
  })

  test('does not match unrelated packages', () => {
    expect(isWorkerExcludedImport('@vitejs/plugin-vue')).toBe(false)
    expect(isWorkerExcludedImport('vite')).toBe(false)
  })
})

describe('extractWorkerConfig', () => {
  test('extracts simple plugin calls', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain("import vue from '@vitejs/plugin-vue'")
    expect(result.code).toContain('vue()')
  })

  test('excludes Vrowzer() call and its import', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    Vrowzer({ serviceWorkerEntry: 'test' })
  ]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('vue()')
    expect(result.code).not.toContain('Vrowzer')
    expect(result.code).not.toContain('@vrowzer/vite-plugin')
  })

  test('preserves plugin with arguments', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue({ compiler })]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain("import vue from '@vitejs/plugin-vue'")
    expect(result.code).toContain("import * as compiler from 'vue/compiler-sfc'")
    expect(result.code).toContain('vue({ compiler })')
  })

  test('preserves named import', () => {
    const source = `
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain("import { svelte } from '@sveltejs/vite-plugin-svelte'")
    expect(result.code).toContain('svelte()')
  })

  test('preserves local function plugin', () => {
    const source = `
import { defineConfig } from 'vite'

function myPlugin() {
  return { name: 'my-plugin' }
}

export default defineConfig({
  plugins: [myPlugin()]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('function myPlugin()')
    expect(result.code).toContain('myPlugin()')
  })

  test('detects spread as unsupported', () => {
    const source = `
import { defineConfig } from 'vite'
const basePlugins = []

export default defineConfig({
  plugins: [...basePlugins]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported.length).toBeGreaterThan(0)
    expect(result.unsupported[0]).toContain('spread')
  })

  test('detects conditional expression as unsupported', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const isDev = true
export default defineConfig({
  plugins: [isDev ? vue() : null]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported.length).toBeGreaterThan(0)
    expect(result.unsupported[0]).toContain('conditional')
  })

  test('excludes type-only imports', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    // 'vite' import (defineConfig) should not appear since it's a vite import
    expect(result.code).not.toContain("from 'vite'")
  })

  test('handles export default without defineConfig', () => {
    const source = `
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue()]
}
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('vue()')
  })

  test('handles no export default', () => {
    const source = `const x = 1`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toContain('no export default found')
    expect(result.code).toContain('plugins: []')
  })

  test('forwards only the resolved server origin', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    origin: computedOrigin,
    port: 4173,
    proxy: { '/api': 'http://localhost:3000' },
    fs: { strict: false },
    hmr: { port: 4174 },
    watch: null
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts', {
      serverOrigin: 'https://assets.example.test'
    })

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('server: { origin: "https://assets.example.test" }')
    expect(result.code).not.toContain('computedOrigin')
    expect(result.code).not.toContain('port: 4173')
    expect(result.code).not.toContain("proxy: { '/api'")
    expect(result.code).not.toContain('fs: { strict: false }')
    expect(result.code).not.toContain('hmr: { port: 4174 }')
    expect(result.code).not.toContain('watch: null')
  })

  test('forwards resolved server origin and forward console options', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    origin: computedOrigin,
    forwardConsole: false,
    port: 4173
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts', {
      serverOrigin: 'https://assets.example.test',
      serverForwardConsole: {
        enabled: true,
        unhandledErrors: false,
        logLevels: ['error', 'log']
      }
    })

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain(
      'server: { origin: "https://assets.example.test", forwardConsole: {"enabled":true,"unhandledErrors":false,"logLevels":["error","log"]} }'
    )
    expect(result.code).not.toContain('computedOrigin')
    expect(result.code).not.toContain('forwardConsole: false')
    expect(result.code).not.toContain('port: 4173')
  })

  test('forwards resolved forward console options without an origin', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts', {
      serverForwardConsole: {
        enabled: false,
        unhandledErrors: false,
        logLevels: []
      }
    })

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain(
      'server: { forwardConsole: {"enabled":false,"unhandledErrors":false,"logLevels":[]} }'
    )
  })

  test('does not forward server config without a resolved origin', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    origin: 'https://source.example.test',
    forwardConsole: true,
    port: 4173
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual([])
    expect(result.code).not.toContain('server:')
    expect(result.code).not.toContain('source.example.test')
    expect(result.code).not.toContain('forwardConsole')
    expect(result.code).not.toContain('4173')
  })

  test('forwards inline html additional asset sources', () => {
    const source = `
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  html: {
    additionalAssetSources: {
      'my-asset': {
        srcAttributes: ['data-src'],
        filter: ({ attributes }) => attributes.kind === 'image'
      }
    }
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('html: {')
    expect(result.code).toContain('additionalAssetSources')
    expect(result.code).toContain("srcAttributes: ['data-src']")
    expect(result.code).toContain("filter: ({ attributes }) => attributes.kind === 'image'")
  })

  test.each([
    ["'src/main.ts'", "input: 'src/main.ts'"],
    ["['src/main.ts', 'src/admin.ts']", "input: ['src/main.ts', 'src/admin.ts']"],
    [
      "{ main: 'src/main.ts', admin: 'src/admin.ts' }",
      "input: { main: 'src/main.ts', admin: 'src/admin.ts' }"
    ]
  ])('forwards static top-level input %s', (input, expected) => {
    const source = `
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  input: ${input}
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain(expected)
  })

  test('forwards only per-environment input options', () => {
    const source = `
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  input: 'src/main.ts',
  environments: {
    client: {
      input: ['src/client.ts'],
      dev: { createEnvironment: hostClientEnvironment },
      plugins: [hostOnlyPlugin()]
    },
    ssr: {
      input: { server: 'src/server.ts' },
      build: { createEnvironment: hostBuildEnvironment }
    },
    browser: {
      define: { __HOST_ONLY__: 'true' }
    }
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual([])
    expect(result.code).toContain("input: 'src/main.ts'")
    expect(result.code).toContain(
      'environments: { "client": { input: [\'src/client.ts\'] }, "ssr": { input: { server: \'src/server.ts\' } } }'
    )
    expect(result.code).not.toContain('hostClientEnvironment')
    expect(result.code).not.toContain('hostOnlyPlugin')
    expect(result.code).not.toContain('hostBuildEnvironment')
    expect(result.code).not.toContain('__HOST_ONLY__')
  })

  test('reports input forms that cannot be isolated for the Worker', () => {
    const source = `
import { defineConfig } from 'vite'

const workerInput = 'src/main.ts'
const sharedEnvironment = { input: 'src/shared.ts' }

export default defineConfig({
  plugins: [],
  input: workerInput,
  environments: {
    ...sharedEnvironment,
    client: {
      input: workerInput
    },
    ssr: sharedEnvironment
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual(
      expect.arrayContaining([
        expect.stringContaining('input is not an inline string'),
        expect.stringContaining('environment spread element'),
        expect.stringContaining('"client" input is not an inline string'),
        expect.stringContaining('"ssr" is not an inline object')
      ])
    )
    expect(result.code).not.toContain('input: workerInput')
    expect(result.code).not.toContain('environments:')
  })

  test('does not forward input through top-level spread or computed keys', () => {
    const source = `
import { defineConfig } from 'vite'

const shared = { input: 'src/shared.ts' }
const inputKey = 'input'

export default defineConfig({
  plugins: [],
  ...shared,
  [inputKey]: 'src/main.ts',
  environments: {
    client: { input: 'src/client.ts' }
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual(
      expect.arrayContaining([
        expect.stringContaining('config spread element'),
        expect.stringContaining('computed config key')
      ])
    )
    expect(result.code).not.toContain('src/shared.ts')
    expect(result.code).not.toContain('src/main.ts')
    expect(result.code).not.toContain('src/client.ts')
  })

  test('does not forward an environment input with ambiguous properties', () => {
    const source = `
import { defineConfig } from 'vite'

const shared = { input: 'src/override.ts' }

export default defineConfig({
  plugins: [],
  environments: {
    client: {
      input: 'src/client.ts',
      ...shared
    },
    ssr: {
      input: 'src/server.ts'
    }
  }
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')

    expect(result.unsupported).toEqual([
      expect.stringContaining('environment "client" spread element')
    ])
    expect(result.code).not.toContain('src/client.ts')
    expect(result.code).toContain('environments: { "ssr": { input: \'src/server.ts\' } }')
  })

  test('handles multiple plugins with mixed imports', () => {
    const source = `
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { Vrowzer } from '@vrowzer/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    react(),
    Vrowzer()
  ]
})
`
    const result = extractWorkerConfig(source, 'vite.config.ts')
    expect(result.unsupported).toEqual([])
    expect(result.code).toContain('vue()')
    expect(result.code).toContain('react()')
    expect(result.code).not.toContain('Vrowzer')
  })
})
