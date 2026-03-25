import { Vrowzer } from 'vrowzer'
// @ts-expect-error
import manifest from './vrowzer-manifest.json?vrowzer'

const statusEl = document.getElementById('status')!

const vrowzer = Vrowzer({ basePath: '/__preview__/' })

async function init() {
  const files = {
    ...manifest.files,
    ...manifest.vendor,
    ...manifest.nodeModules
  }
  const ready = await vrowzer.ready({ files })

  if (!ready) {
    statusEl.textContent = 'Failed'
    return
  }

  vrowzer.mount(document.getElementById('app')!)
  statusEl.textContent = 'Ready'

  // Expose for E2E test access
  ;(window as any).__vrowzer__ = vrowzer
}

init()
