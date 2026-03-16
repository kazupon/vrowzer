import { Vrowser } from 'vrowser'
// @ts-expect-error -- virtual module provided by Vrowser plugin
import manifest from 'virtual:vrowser-manifest'

const statusEl = document.getElementById('status')!

const vrowser = Vrowser({ basePath: '/__preview__/' })

async function init() {
  statusEl.textContent = 'Initializing...'

  const files = {
    ...manifest.files,
    ...manifest.nodeModules
  }

  const ready = await vrowser.ready({ files })

  if (!ready) {
    statusEl.textContent = 'Failed to initialize'
    return
  }

  vrowser.mount(document.getElementById('preview')!)
  statusEl.textContent = 'Ready'
}

init()
