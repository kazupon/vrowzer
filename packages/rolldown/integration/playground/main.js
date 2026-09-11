/**
 * E2E test page for @vrowzer/rolldown
 *
 * Imports pre-bundled rolldown and runs a bundling operation in the browser.
 * Results are exposed via window.testState for Playwright assertions.
 */

// These imports work because @vrowzer/rolldown pre-bundles all dependencies
import { VERSION, rolldown } from '@vrowzer/rolldown/browser'
import { memfs } from '@vrowzer/rolldown/browser/experimental'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'bundling'

    // Populate virtual filesystem
    memfs.volume.reset()
    memfs.volume.fromJSON({
      '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
      '/src/math.js': 'export function add(a, b) { return a + b }',
      '/src/emitted.js': 'export default "emitted chunk"'
    })

    // Run rolldown in the browser
    const fileUrlCalls = []
    let assetRef
    let chunkRef
    const bundle = await rolldown({
      input: '/src/index.js',
      cwd: '/',
      plugins: [
        {
          name: 'file-url-fixture',
          buildStart() {
            assetRef = this.emitFile({
              type: 'asset',
              name: 'message.txt',
              source: 'asset contents'
            })
            chunkRef = this.emitFile({ type: 'chunk', id: '/src/emitted.js', name: 'emitted' })
          },
          transform(code, id) {
            if (id !== '/src/index.js') {
              return
            }
            return `${code}\nexport const assetUrl = import.meta.ROLLDOWN_FILE_URL_${assetRef}_assetMetadata;
              export const chunkUrl = import.meta.ROLLDOWN_FILE_URL_${chunkRef};`
          },
          resolveFileUrl(args) {
            fileUrlCalls.push(args)
            return JSON.stringify(`/preview/${args.fileName}`)
          }
        }
      ]
    })
    let output
    try {
      ;({ output } = await bundle.generate({
        format: 'esm',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }))
    } finally {
      await bundle.close()
    }

    const entry = output.find(file => file.type === 'chunk' && file.name === 'index')
    const emitted = output.find(file => file.type === 'chunk' && file.name === 'emitted')
    const asset = output.find(file => file.type === 'asset')
    const code = entry.code

    window.testState = {
      status: 'success',
      result: {
        code,
        fileName: entry.fileName,
        version: VERSION,
        fileUrlCalls,
        assetFileName: asset.fileName,
        emittedFileName: emitted.fileName
      },
      error: null
    }

    document.getElementById('status').textContent = 'success'
    document.getElementById('result').textContent = code
  } catch (e) {
    window.testState = {
      status: 'error',
      result: null,
      error: e.message
    }
    document.getElementById('status').textContent = `error: ${e.message}`
    console.error('Rolldown E2E error:', e)
  }
}

run()
