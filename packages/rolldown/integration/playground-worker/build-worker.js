/**
 * SPIKE (#36): a dedicated build Worker that bundles a small project with rolldown.
 */

import { rolldown, VERSION } from '@vrowzer/rolldown'
import { vol } from '@vrowzer/fs'

const PROJECT = {
  '/src/index.ts': [
    "import { add } from './math'",
    'export { add }',
    "export default function greet(name: string): string { return 'Hello, ' + name }",
    "export async function loadLazy(): Promise<string> { const m = await import('./lazy'); return m.lazyValue }",
    ''
  ].join('\n'),
  '/src/math.ts': [
    'export function add(a: number, b: number): number { return a + b }',
    "export function unused(): string { return 'tree-shaken-away' }",
    ''
  ].join('\n'),
  '/src/lazy.ts': "export const lazyValue: string = 'lazy-chunk-value'\n"
}

const OUTPUTS = {
  split: { format: 'es', minify: true, sourcemap: true },
  single: { format: 'es', minify: true, sourcemap: false, codeSplitting: false },
  plain: { format: 'es', minify: false, sourcemap: false }
}

self.postMessage({ type: 'ready', version: VERSION, at: performance.now() })

self.onmessage = async event => {
  const { id, type, payload } = event.data
  try {
    if (type !== 'build') {
      throw new Error(`unknown request: ${type}`)
    }
    vol.reset()
    vol.fromJSON(payload.files ?? PROJECT)
    const t0 = performance.now()
    const bundle = await rolldown({ input: payload.input ?? '/src/index.ts', cwd: '/' })
    const t1 = performance.now()
    const { output } = await bundle.generate(OUTPUTS[payload.output ?? 'split'])
    const t2 = performance.now()
    await bundle.close()
    const t3 = performance.now()
    const files = output.map(item => ({
      fileName: item.fileName,
      type: item.type,
      isEntry: item.type === 'chunk' ? item.isEntry : undefined,
      code:
        item.type === 'chunk'
          ? item.code
          : typeof item.source === 'string'
            ? item.source
            : `[binary ${item.source.byteLength}]`
    }))
    // Do not keep the snapshot while idle
    vol.reset()
    self.postMessage({
      id,
      ok: true,
      result: { files, timings: { rolldown: t1 - t0, generate: t2 - t1, close: t3 - t2 } }
    })
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.stack ?? error) })
  }
}
