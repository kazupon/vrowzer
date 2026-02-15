import { describe, it, expect } from 'vitest'
import { Writable } from 'readable-stream'

describe('test-stream3-cork-uncork', () => {
  // Test the buffering behavior of Writable streams.
  //
  // The call to cork() triggers storing chunks which are flushed
  // on calling uncork() in the same tick.

  it('should buffer chunks on cork and flush on uncork', () =>
    new Promise<void>(resolve => {
      const expectedChunks = ['please', 'buffer', 'me', 'kindly']
      const inputChunks = expectedChunks.slice(0)
      let seenChunks: Buffer[] = []
      let seenEnd = false
      const w = new Writable()
      // Let's arrange to store the chunks.
      w._write = function (chunk: Buffer, encoding: string, cb: () => void) {
        // Default encoding given none was specified.
        expect(encoding).toBe('buffer')
        seenChunks.push(chunk)
        cb()
      }
      // Let's record the stream end event.
      w.on('finish', () => {
        seenEnd = true
      })

      function writeChunks(remainingChunks: string[], callback: () => void) {
        const writeChunk = remainingChunks.shift()
        if (writeChunk) {
          setImmediate(() => {
            const writeState = w.write(writeChunk)
            // We were not told to stop writing.
            expect(writeState).toBeTruthy()
            writeChunks(remainingChunks, callback)
          })
        } else {
          callback()
        }
      }

      // Do an initial write.
      w.write('stuff')
      // The write was immediate.
      expect(seenChunks.length).toBe(1)
      // Reset the chunks seen so far.
      seenChunks = []

      // Trigger stream buffering.
      w.cork()

      // Write the bufferedChunks.
      writeChunks(inputChunks, () => {
        // Should not have seen anything yet.
        expect(seenChunks.length).toBe(0)

        // Trigger writing out the buffer.
        w.uncork()

        // Buffered bytes should be seen in current tick.
        expect(seenChunks.length).toBe(4)

        // Did the chunks match.
        for (let i = 0, l = expectedChunks.length; i < l; i++) {
          const seen = seenChunks[i]
          // There was a chunk.
          expect(seen).toBeTruthy()
          const expected = Buffer.from(expectedChunks[i]!)
          // It was what we expected.
          expect(seen!.equals(expected)).toBeTruthy()
        }
        setImmediate(() => {
          // The stream should not have been ended.
          expect(seenEnd).toBeFalsy()
          resolve()
        })
      })
    }))
})
