/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import { Vrowzer } from 'vrowzer'

// Count live Workers, so that the tests can check that dispose() terminates the Web Worker.
// Worker is replaced before any Vrowzer instance creates one.
const liveWorkers = new Set<Worker>()

class TrackedWorker extends Worker {
  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    super(scriptURL, options)
    liveWorkers.add(this)
  }

  override terminate(): void {
    liveWorkers.delete(this)
    super.terminate()
  }
}

window.Worker = TrackedWorker

const previewFiles = {
  '/index.html': `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Dispose preview</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
  '/main.js': `document.querySelector('#app').textContent = 'Dispose preview works'`
}

Object.assign(window, {
  __createVrowzer__: () => Vrowzer(),
  __previewFiles__: previewFiles,
  __liveWorkerCount__: () => liveWorkers.size
})

document.body.dataset.fixtureReady = 'true'
