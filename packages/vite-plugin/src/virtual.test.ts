import { rolldown } from 'rolldown'
import { describe, expect, test } from 'vite-plus/test'
import { generateWebWorkerEntry } from './virtual.ts'

async function loadEntry(
  configSource: string,
  legacyResolve?: Parameters<typeof generateWebWorkerEntry>[1]
) {
  const configPath = "/config with spaces/worker's config.mjs"
  const bundle = await rolldown({
    input: 'entry',
    plugins: [
      {
        name: 'test:worker-entry',
        resolveId: id => id,
        load(id) {
          if (id === 'entry') {
            return `${generateWebWorkerEntry(configPath, legacyResolve)}
            export { captured } from 'vrowzer/web-worker-core'
            export { default as original } from ${JSON.stringify(configPath)}`
          }
          if (id === configPath) {
            return configSource
          }
          return 'export let captured; export function initWebWorker(config) { captured = config }'
        }
      }
    ]
  })
  try {
    const { output } = await bundle.generate({ format: 'esm' })
    const chunk = output[0]!
    if (chunk.type !== 'chunk') {
      throw new Error('Missing Worker entry')
    }
    return await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`)
  } finally {
    await bundle.close()
  }
}

describe('generated Worker entry config', () => {
  const source = `export default Object.freeze({
    plugins: [{ name: 'worker', transform: code => code + '!' }],
    resolve: { alias: [{ find: 'dedicated', replacement: '/dedicated.js' }], dedupe: ['svelte'] }
  })`

  test('preserves functions and a dedicated resolve object without mutating the export', async () => {
    const { captured, original } = await loadEntry(source)
    expect(captured).not.toBe(original)
    expect(captured.resolve).toBe(original.resolve)
    expect(captured.plugins).toBe(original.plugins)
    expect(captured.plugins[0].transform('code')).toBe('code!')
  })

  test.each([{}, { alias: [{ find: 'legacy', replacement: '/legacy.js' }] }])(
    'replaces the entire resolve object with the legacy option %j',
    async legacy => {
      const { captured, original } = await loadEntry(source, legacy)
      expect(captured.resolve).toEqual(legacy)
      expect(captured.resolve).not.toHaveProperty('dedupe')
      expect(original.resolve.dedupe).toEqual(['svelte'])
    }
  )

  test('keeps the legacy option usable without a dedicated config', async () => {
    const legacy = { alias: [{ find: 'legacy', replacement: '/legacy.js' }] }
    const { captured } = await loadEntry('export default { plugins: [] }', legacy)
    expect(captured).toEqual({ plugins: [], resolve: legacy })
  })
})
