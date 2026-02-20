/// <reference lib="webworker" />

import type { BundleRequestMessage, BundleResultMessage } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

console.log('[Rolldown Worker] initialized')

let viteWebWorkerPromise: Promise<typeof import('@vrowser/vite-dev-server/web-worker')> | null =
  null
function loadViteWebWorker() {
  if (!viteWebWorkerPromise) {
    viteWebWorkerPromise = (async () => {
      const module = await import('@vrowser/vite-dev-server/web-worker')
      return module
    })()
  }
  return viteWebWorkerPromise
}

const previewBase = '/__preview__/'

self.onmessage = async (event: MessageEvent<BundleRequestMessage>) => {
  const { type, files, input } = event.data

  const { setupWorker, bundle } = await loadViteWebWorker()
  await setupWorker(
    {
      root: '/',
      base: previewBase,
      publicDir: 'public',
      // NOTE(kazupon): disable optimizeDeps for sw dev server, because vite optimizer is not working well on service worker environment.
      optimizeDeps: {
        disabled: true
      },
      experimental: {
        importGlobRestoreExtension: false,
        renderBuiltUrl: () => undefined,
        hmrPartialAccept: false,
        enableNativePlugin: 'v2',
        bundledDev: false
      }
    },
    { basePath: previewBase }
  )

  if (type === 'bundle') {
    try {
      const [code, fileName] = await bundle(files, input)
      const result: BundleResultMessage = {
        type: 'bundle-result',
        success: true,
        code,
        fileName
      }
      console.log('[Rolldown Worker] bundle result:', result)
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
