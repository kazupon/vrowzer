import { describe, expect, it, vi } from 'vite-plus/test'
import type { FSWatcher } from '#dep-types/chokidar'
import { makeWatcherCloseFinal } from './watch'

function createWatcher(close: () => Promise<void> = async () => undefined) {
  const add = vi.fn<(this: FSWatcher, paths: string) => FSWatcher>(
    function () {
      return this
    },
  )
  const closeSpy = vi.fn<() => Promise<void>>(close)
  const watcher = { add, close: closeSpy } as unknown as FSWatcher
  return { watcher, add, close: closeSpy }
}

describe('makeWatcherCloseFinal', () => {
  it('delegates add() until the watcher is closed', async () => {
    const { watcher, add, close } = createWatcher()

    expect(makeWatcherCloseFinal(watcher)).toBe(watcher)
    expect(watcher.add('/project/src/main.ts')).toBe(watcher)
    expect(add).toHaveBeenCalledExactlyOnceWith('/project/src/main.ts')

    await watcher.close()
    expect(close).toHaveBeenCalledOnce()

    expect(watcher.add('/project/src/other.ts')).toBe(watcher)
    expect(add).toHaveBeenCalledOnce()
  })

  it('keeps the watcher closed when add() is called while close is pending', async () => {
    let finishClose!: () => void
    const { watcher, add } = createWatcher(
      () =>
        new Promise((resolve) => {
          finishClose = resolve
        }),
    )
    makeWatcherCloseFinal(watcher)

    const closing = watcher.close()
    watcher.add('/project/src/main.ts')
    finishClose()
    await closing

    expect(add).not.toHaveBeenCalled()
  })
})
