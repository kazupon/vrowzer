/// <reference lib="webworker" />

import type { BundleResultMessage, MainToWorkerMessage } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

console.log('[Rolldown Worker] initialized')

let viteWebWorkerPromise: Promise<typeof import('@vrowser/vite-dev-server/web-worker')> | null =
  null
function loadViteWebWorker() {
  if (!viteWebWorkerPromise) {
    viteWebWorkerPromise = (async () => {
      return await import('@vrowser/vite-dev-server/web-worker')
    })()
  }
  return viteWebWorkerPromise
}

let setupDone = false

self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  switch (event.data.type) {
    case 'V_WW_SETUP': {
      try {
        console.log('[Rolldown Worker] V_WW_SETUP received, loading vite-dev-server/web-worker...')
        const { setupWorker } = await loadViteWebWorker()
        console.log('[Rolldown Worker] setupWorker loaded, initializing...')
        await setupWorker(event.data.config, event.data.options)
        setupDone = true
        self.postMessage({ type: 'V_WW_SETUP_ACK' })
        console.log('[Rolldown Worker] setup complete')
      } catch (error) {
        console.error('[Rolldown Worker] V_WW_SETUP failed:', error)
      }
      break
    }

    case 'V_SW_CONNECT_PORT': {
      const port = event.ports[0]
      if (!port) {
        console.error('[Rolldown Worker] V_SW_CONNECT_PORT: no port received')
        break
      }

      const { connectServiceWorkerPort } = await loadViteWebWorker()
      const rpc = await connectServiceWorkerPort(port, {
        async transformRequest(url, options) {
          // TODO: delegate to DevEnvironment.transformRequest
          console.log('[Rolldown Worker] transformRequest:', url, options)
          return null
        },
        async transformIndexHtml(url, html, _originalUrl) {
          // TODO: delegate to devHtmlTransformFn
          console.log('[Rolldown Worker] transformIndexHtml:', url)
          return html
        }
      })

      // Notify Main Thread that handshake is complete
      self.postMessage({ type: 'V_SW_CONNECT_PORT_ACK' })
      console.log('[Rolldown Worker] SW<->WW birpc channel established', rpc)
      break
    }

    case 'bundle': {
      const { files, input } = event.data

      // Ensure setupWorker has been called
      if (!setupDone) {
        const { setupWorker } = await loadViteWebWorker()
        await setupWorker(
          {
            root: '/',
            base: '/__preview__/',
            publicDir: 'public',
            optimizeDeps: { disabled: true },
            experimental: {
              importGlobRestoreExtension: false,
              renderBuiltUrl: () => undefined,
              hmrPartialAccept: false,
              enableNativePlugin: 'v2',
              bundledDev: false
            }
          },
          { basePath: '/__preview__/' }
        )
        setupDone = true
      }

      try {
        const { bundle } = await loadViteWebWorker()
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
      break
    }
  }
}
