import { Vrowzer } from 'vrowzer'

const status = document.getElementById('status')!
const container = document.getElementById('preview-container')!

const vrowzer = Vrowzer()

async function init() {
  try {
    const ready = await vrowzer.ready({
      files: {
        '/index.html': `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Custom base preview</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
        '/main.js': `document.querySelector('#app').textContent = 'Custom base preview works'`
      }
    })

    if (!ready) {
      status.textContent = 'Failed to initialize'
      return
    }

    vrowzer.mount(container)
    status.textContent = 'Ready'
  } catch (error) {
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

void init()
