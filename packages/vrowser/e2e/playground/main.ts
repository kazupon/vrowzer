import { Vrowser } from 'vrowser'

const status = document.getElementById('status')!
const container = document.getElementById('preview-container')!

// Expose vrowser instance for E2E test access
const vrowser = Vrowser({ basePath: '/__preview__/' })
;(window as any).__vrowser__ = vrowser

async function init() {
  try {
    status.textContent = 'Initializing vrowser...'

    const ready = await vrowser.ready({
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
  <h1>Hello from Vrowser!</h1>
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
    await vrowser.mount(container)
    status.textContent = 'Ready'
  } catch (error) {
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
    console.error('[E2E] init error:', error)
  }
}

init()
