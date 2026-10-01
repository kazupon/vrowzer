import { Vrowzer } from 'vrowzer'

const status = document.getElementById('status')!
const container = document.getElementById('preview-container')!
const serviceWorkerReadyTimeout = new URLSearchParams(location.search).get(
  'serviceWorkerReadyTimeout'
)

// Expose vrowzer instance for E2E test access
const vrowzer = Vrowzer({
  basePath: '/__preview__/',
  ...(serviceWorkerReadyTimeout === null
    ? {}
    : { serviceWorkerReadyTimeout: Number(serviceWorkerReadyTimeout) })
})
;(window as any).__vrowzer__ = vrowzer

// Binary files given to ready(). The tests check their bytes in both Workers, and that these
// buffers stay usable after ready().
const initialBinaryBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]
const initialBinaryFiles = {
  '/public/initial-public.png': new Uint8Array(initialBinaryBytes).buffer,
  '/initial-binary/pixel.png': new Uint8Array(initialBinaryBytes).buffer
}
;(window as any).__initialBinaryFiles__ = initialBinaryFiles

// `?files=readme-example` gives ready() only the files of the README usage example, which has no
// /index.html. A test opens it in a new browser context, with a Service Worker of its own.
const readmeExample = new URLSearchParams(location.search).get('files') === 'readme-example'
const readmeExampleFiles = {
  '/main.js': `
      document.getElementById('app').innerHTML = '<h1>Hello!</h1>'
      if (import.meta.hot) { import.meta.hot.accept() }
    `
}

async function init() {
  try {
    status.textContent = 'Initializing vrowzer...'

    const ready = await vrowzer.ready({
      files: readmeExample
        ? readmeExampleFiles
        : {
            ...initialBinaryFiles,
            '/public/initial-public.txt': 'initial public file',
            '/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="app"><p>Loading...</p></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
            '/main.js': `
document.getElementById('app').innerHTML = \`
  <h1>Hello from Vrowzer!</h1>
  <p id="counter">count: 0</p>
\`
globalThis.__vrowzerContextAtScriptStart = globalThis.__VROWZER_PREVIEW__

if (import.meta.hot) {
  import.meta.hot.accept()
}
`
          }
    })

    if (!ready) {
      status.textContent = 'Failed to initialize'
      return
    }

    status.textContent = 'Mounting preview...'
    vrowzer.mount(container, {
      id: 'preview',
      params: { viewport: 'primary' }
    })
    status.textContent = 'Ready'
  } catch (error) {
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
    console.error('[E2E] init error:', error)
  }
}

init()
