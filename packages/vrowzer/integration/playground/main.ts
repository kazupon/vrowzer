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

async function init() {
  try {
    status.textContent = 'Initializing vrowzer...'

    const ready = await vrowzer.ready({
      files: {
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
    await vrowzer.mount(container)
    status.textContent = 'Ready'
  } catch (error) {
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
    console.error('[E2E] init error:', error)
  }
}

init()
