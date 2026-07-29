/**
 * E2E test page for @vrowzer/rolldown (shared build)
 *
 * Tests that rolldown's memfs and @vrowzer/fs share the same Volume instance.
 * Files written via @vrowzer/fs should be readable by rolldown, and vice versa.
 */

import { rolldown } from '@vrowzer/rolldown'
import { memfs } from '@vrowzer/rolldown/experimental'
import { fs, vol } from '@vrowzer/fs'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'testing'

    // Test 1: Write via @vrowzer/fs, read via rolldown's memfs
    vol.reset()
    fs.mkdirSync('/test', { recursive: true })
    fs.writeFileSync('/test/hello.txt', 'written by @vrowzer/fs')

    const readViaMemfs = memfs.fs.readFileSync('/test/hello.txt', 'utf-8')
    if (readViaMemfs !== 'written by @vrowzer/fs') {
      throw new Error(
        `memfs cannot read @vrowzer/fs data: expected "written by @vrowzer/fs", got "${readViaMemfs}"`
      )
    }

    // Test 2: Write via rolldown's memfs, read via @vrowzer/fs
    memfs.fs.writeFileSync('/test/world.txt', 'written by rolldown memfs')

    const readViaFs = fs.readFileSync('/test/world.txt', 'utf-8')
    if (readViaFs !== 'written by rolldown memfs') {
      throw new Error(
        `@vrowzer/fs cannot read memfs data: expected "written by rolldown memfs", got "${readViaFs}"`
      )
    }

    // Test 3: Write a source larger than the default 10KB fs-proxy payload,
    // then bundle it with rolldown.
    const largePayload = 'x'.repeat(16 * 1024)
    vol.fromJSON({
      '/src/index.js':
        'import { add } from "./math.js"\nimport { large } from "./large.js"\nconsole.log(add(1, 2), large)',
      '/src/math.js': 'export function add(a, b) { return a + b }',
      '/src/large.js': `export const large = ${JSON.stringify(largePayload)}`
    })

    const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
    const { output } = await bundle.generate({ format: 'esm' })

    window.testState = {
      status: 'success',
      result: {
        sharedRead: true,
        bundleCode: output[0].code,
        fileName: output[0].fileName,
        largeSourceBundled: output[0].code.includes(largePayload)
      },
      error: null
    }

    document.getElementById('status').textContent = 'success'
  } catch (e) {
    window.testState = {
      status: 'error',
      result: null,
      error: e.message
    }
    document.getElementById('status').textContent = `error: ${e.message}`
    console.error('Shared build E2E error:', e)
  }
}

run()
