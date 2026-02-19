/// <reference lib="webworker" />

import type { BundleRequestMessage, BundleResultMessage } from '../types.ts'

declare const self: DedicatedWorkerGlobalScope

console.log('[Rolldown Worker] initialized')

// Lazily load rolldown to avoid blocking onmessage registration.
// rolldown's WASM init (top-level await) creates sub-workers and uses
// Atomics.wait which can block until all sub-workers are ready.
let rolldownPromise: Promise<{
  rolldown: typeof import('@vrowser/rolldown').rolldown
  memfs: typeof import('@vrowser/rolldown/experimental').memfs
}> | null = null

function loadRolldown() {
  if (!rolldownPromise) {
    rolldownPromise = (async () => {
      console.log('[Rolldown Worker] loading rolldown...')
      const [{ rolldown }, { memfs }] = await Promise.all([
        import('@vrowser/rolldown'),
        import('@vrowser/rolldown/experimental')
      ])
      console.log('[Rolldown Worker] rolldown loaded')
      return { rolldown, memfs: memfs! }
    })()
  }
  return rolldownPromise
}

self.onmessage = async (event: MessageEvent<BundleRequestMessage>) => {
  const { type, files, input } = event.data

  if (type === 'bundle') {
    try {
      const { rolldown, memfs } = await loadRolldown()

      console.log('[Rolldown Worker] bundling', input)

      memfs.volume.reset()
      memfs.volume.fromJSON(files)

      const bundle = await rolldown({ input, cwd: '/' })
      const { output } = await bundle.generate({ format: 'esm' })

      const result: BundleResultMessage = {
        type: 'bundle-result',
        success: true,
        code: output[0].code,
        fileName: output[0].fileName
      }
      self.postMessage(result)
    } catch (error) {
      const result: BundleResultMessage = {
        type: 'bundle-result',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      self.postMessage(result)
    }
  }
}
