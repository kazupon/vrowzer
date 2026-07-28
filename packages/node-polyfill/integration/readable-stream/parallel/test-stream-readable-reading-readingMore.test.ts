import { describe, it, expect } from 'vite-plus/test'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

describe('test-stream-readable-reading-readingMore', () => {
  it('reading and readingMore state with readable and data listeners', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read(_size) {}
      })
      const state = (readable as any)._readableState

      // Starting off with false initially.
      expect(state.reading).toBe(false)
      expect(state.readingMore).toBe(false)

      readable.on(
        'data',
        mustCall((_data: unknown) => {
          // While in a flowing state with a 'readable' listener
          // we should not be reading more
          if (readable.readableFlowing) {
            expect(state.readingMore).toBe(true)
          }

          // Reading as long as we've not ended
          expect(state.reading).toBe(!state.ended)
        }, 2) as (...args: unknown[]) => void
      )

      function onStreamEnd() {
        // End of stream; state.reading is false
        // And so should be readingMore.
        expect(state.readingMore).toBe(false)
        expect(state.reading).toBe(false)
      }

      const expectedReadingMore = [true, true, false]
      readable.on(
        'readable',
        mustCall(() => {
          // There is only one readingMore scheduled from on('data'),
          // after which everything is governed by the .read() call
          expect(state.readingMore).toBe(expectedReadingMore.shift())

          // If the stream has ended, we shouldn't be reading
          expect(state.ended).toBe(!state.reading)

          // Consume all the data
          while (readable.read() !== null) {}
          if (expectedReadingMore.length === 0) // Reached end of stream
          {
            process.nextTick(mustCall(onStreamEnd, 1) as (...args: unknown[]) => void)
          }
        }, 3) as (...args: unknown[]) => void
      )

      readable.on(
        'end',
        mustCall(() => {
          onStreamEnd()
          resolve()
        }) as (...args: unknown[]) => void
      )

      readable.push('pushed')
      readable.read(6)

      // reading
      expect(state.reading).toBe(true)
      expect(state.readingMore).toBe(true)

      // add chunk to front
      readable.unshift('unshifted')

      // end
      readable.push(null)
    }))

  it('reading and readingMore state with data listener only', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read(_size) {}
      })
      const state = (readable as any)._readableState

      // Starting off with false initially.
      expect(state.reading).toBe(false)
      expect(state.readingMore).toBe(false)

      readable.on(
        'data',
        mustCall((_data: unknown) => {
          // While in a flowing state without a 'readable' listener
          // we should be reading more
          if (readable.readableFlowing) {
            expect(state.readingMore).toBe(true)
          }

          // Reading as long as we've not ended
          expect(state.reading).toBe(!state.ended)
        }, 2) as (...args: unknown[]) => void
      )

      function onStreamEnd() {
        // End of stream; state.reading is false
        // And so should be readingMore.
        expect(state.readingMore).toBe(false)
        expect(state.reading).toBe(false)
      }

      readable.on(
        'end',
        mustCall(() => {
          onStreamEnd()
          resolve()
        }) as (...args: unknown[]) => void
      )

      readable.push('pushed')

      // Stop emitting 'data' events
      expect(state.flowing).toBe(true)
      readable.pause()

      // paused
      expect(state.reading).toBe(false)
      expect(state.flowing).toBe(false)
      readable.resume()
      expect(state.reading).toBe(false)
      expect(state.flowing).toBe(true)

      // add chunk to front
      readable.unshift('unshifted')

      // end
      readable.push(null)
    }))

  it('reading and readingMore state with readable listener removed', () =>
    new Promise<void>(resolve => {
      const readable = new Readable({
        read(_size) {}
      })
      const state = (readable as any)._readableState

      // Starting off with false initially.
      expect(state.reading).toBe(false)
      expect(state.readingMore).toBe(false)

      const onReadable = mustNotCall() as (...args: unknown[]) => void
      readable.on('readable', onReadable)
      readable.on(
        'data',
        mustCall((_data: unknown) => {
          // Reading as long as we've not ended
          expect(state.reading).toBe(!state.ended)
        }, 2) as (...args: unknown[]) => void
      )
      readable.removeListener('readable', onReadable)

      function onStreamEnd() {
        // End of stream; state.reading is false
        // And so should be readingMore.
        expect(state.readingMore).toBe(false)
        expect(state.reading).toBe(false)
      }

      readable.on(
        'end',
        mustCall(() => {
          onStreamEnd()
          resolve()
        }) as (...args: unknown[]) => void
      )

      readable.push('pushed')

      // We are still not flowing, we will be resuming in the next tick
      expect(state.flowing).toBe(false)

      // Wait for nextTick, so the readableListener flag resets
      process.nextTick(function () {
        readable.resume()

        // Stop emitting 'data' events
        expect(state.flowing).toBe(true)
        readable.pause()

        // paused
        expect(state.flowing).toBe(false)
        readable.resume()
        expect(state.flowing).toBe(true)

        // add chunk to front
        readable.unshift('unshifted')

        // end
        readable.push(null)
      })
    }))
})
