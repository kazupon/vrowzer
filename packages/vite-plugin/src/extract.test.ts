import { describe, expect, test } from 'vitest'
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
