import { Vrowser } from 'vrowser'
// @ts-expect-error
import manifest from './vrowser-manifest.json?vrowser'

const statusEl = document.getElementById('status')!

const vrowser = Vrowser({ basePath: '/__preview__/' })

async function init() {
  const files = {
    ...manifest.files,
    ...(manifest.vendor ?? {}),
    ...(manifest.nodeModules ?? {})
  }
  const ready = await vrowser.ready({ files })

  if (!ready) {
    statusEl.textContent = 'Failed'
    return
  }

  vrowser.mount(document.getElementById('app')!)
  statusEl.textContent = 'Ready'

  // Expose for E2E test access
  ;(window as any).__vrowser__ = vrowser
}

init()
