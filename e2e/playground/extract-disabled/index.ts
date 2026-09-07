import { Vrowzer } from 'vrowzer'
import { marker } from './host/extract-marker.js'

document.getElementById('host-marker')!.textContent = marker
const statusEl = document.getElementById('status')!
const vrowzer = Vrowzer()

async function init() {
  const ready = await vrowzer.ready({
    files: {
      '/index.html': `<!doctype html>
<html><body>
  <div id="preview-marker"></div>
  <div id="alias-value"></div>
  <script type="module" src="/main.js"></script>
</body></html>`,
      '/extract-marker.js': `export const marker = '__EXTRACT_PLUGIN_MARKER__'`,
      '/vendor/preview-lib.js': `export const value = 'alias-initial'`,
      '/main.js': `
import { marker } from './extract-marker.js'
import { value } from 'preview-lib'

document.body.dataset.bootToken = crypto.randomUUID()
document.getElementById('preview-marker').textContent = marker
document.getElementById('alias-value').textContent = value

if (import.meta.hot) {
  import.meta.hot.accept('preview-lib', module => {
    if (module) document.getElementById('alias-value').textContent = module.value
  })
}
`
    }
  })

  if (!ready) {
    statusEl.textContent = 'Failed'
    return
  }

  vrowzer.mount(document.getElementById('app')!, { id: 'preview' })
  ;(window as any).__vrowzer__ = vrowzer
  statusEl.textContent = 'Ready'
}

void init().catch(error => {
  console.error(error)
  statusEl.textContent = 'Failed'
})
