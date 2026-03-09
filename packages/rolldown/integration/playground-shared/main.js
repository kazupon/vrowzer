/**
 * E2E test page for @vrowser/rolldown (shared build)
 *
 * Tests that rolldown's memfs and @vrowser/fs share the same Volume instance.
 * Files written via @vrowser/fs should be readable by rolldown, and vice versa.
 */

import { rolldown } from '@vrowser/rolldown'
import { memfs } from '@vrowser/rolldown/experimental'
import { fs, vol } from '@vrowser/fs'

window.testState = { status: 'initializing', result: null, error: null }

async function run() {
  try {
    document.getElementById('status').textContent = 'testing'

    // Test 1: Write via @vrowser/fs, read via rolldown's memfs
    vol.reset()
    fs.mkdirSync('/test', { recursive: true })
    fs.writeFileSync('/test/hello.txt', 'written by @vrowser/fs')

    const readViaMemfs = memfs.fs.readFileSync('/test/hello.txt', 'utf-8')
    if (readViaMemfs !== 'written by @vrowser/fs') {
      throw new Error(
        `memfs cannot read @vrowser/fs data: expected "written by @vrowser/fs", got "${readViaMemfs}"`
      )
    }

    // Test 2: Write via rolldown's memfs, read via @vrowser/fs
    memfs.fs.writeFileSync('/test/world.txt', 'written by rolldown memfs')

    const readViaFs = fs.readFileSync('/test/world.txt', 'utf-8')
    if (readViaFs !== 'written by rolldown memfs') {
      throw new Error(
        `@vrowser/fs cannot read memfs data: expected "written by rolldown memfs", got "${readViaFs}"`
      )
    }

    // Test 3: Write via @vrowser/fs, bundle with rolldown
    vol.fromJSON({
      '/src/index.js': 'import { add } from "./math.js"\nconsole.log(add(1, 2))',
      '/src/math.js': 'export function add(a, b) { return a + b }'
    })

    const bundle = await rolldown({ input: '/src/index.js', cwd: '/' })
    const { output } = await bundle.generate({ format: 'esm' })

    window.testState = {
      status: 'success',
      result: {
        sharedRead: true,
        bundleCode: output[0].code,
        fileName: output[0].fileName
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
