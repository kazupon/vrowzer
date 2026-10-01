import { createVirtualFSWatcher } from '@vrowzer/fs/watcher'
import { describe, expect, onTestFinished, test } from 'vite-plus/test'
import { syncPublicFiles } from './public-files-sync'

import type { FSWatcher } from '#dep-types/chokidar'

function setup(initialFiles: string[] = []) {
  const watcher = createVirtualFSWatcher()
  onTestFinished(() => watcher.close())
  const publicFiles = new Set(initialFiles)
  syncPublicFiles(watcher as unknown as FSWatcher, '/public', publicFiles)
  return { watcher, publicFiles }
}

describe('syncPublicFiles', () => {
  test('adds files under the public directory as soon as the event is emitted', () => {
    const { watcher, publicFiles } = setup()

    watcher.notify('add', '/public/logo.svg')
    watcher.notify('add', '/public/images/a.png')

    // No await: the list is already updated when notify() returns
    expect([...publicFiles]).toEqual(['/logo.svg', '/images/a.png'])
  })

  test('removes deleted files', () => {
    const { watcher, publicFiles } = setup(['/.gitkeep', '/logo.svg'])

    watcher.notify('unlink', '/public/logo.svg')

    expect([...publicFiles]).toEqual(['/.gitkeep'])
  })

  test('ignores files outside the public directory', () => {
    const { watcher, publicFiles } = setup()

    watcher.notify('add', '/src/main.ts')
    // Vite's `startsWith(publicDir)` check would take this sibling for a public file
    watcher.notify('add', '/publicity.js')
    watcher.notify('add', '/public')
    watcher.notify('add', '/public/../secret.txt')

    expect([...publicFiles]).toEqual([])
  })

  test('keeps the list on change events', () => {
    const { watcher, publicFiles } = setup(['/logo.svg'])

    watcher.notify('change', '/public/logo.svg')
    watcher.notify('change', '/public/new.svg')

    expect([...publicFiles]).toEqual(['/logo.svg'])
  })

  test('normalizes paths before checking them', () => {
    const { watcher, publicFiles } = setup()

    watcher.notify('add', '/public/./b.svg')
    watcher.notify('add', '/public/images/../c.svg')

    expect([...publicFiles]).toEqual(['/b.svg', '/c.svg'])
  })
})
