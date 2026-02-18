import { describe, it, expect } from 'vitest'
import { Readable, Writable } from 'readable-stream'

describe('test-stream3-pause-then-read', () => {
  const silentConsole = {
    log(..._args: unknown[]) {},
    error(..._args: unknown[]) {}
  }

  const totalChunks = 100
  const chunkSize = 99
  const expectTotalData = totalChunks * chunkSize

  it('should handle pause then read correctly', () =>
    new Promise<void>(resolve => {
      let expectEndingData = expectTotalData
      const r = new Readable({
        highWaterMark: 1000
      })
      let chunks = totalChunks
      r._read = function (_n: number) {
        silentConsole.log('_read called', chunks)
        if (!(chunks % 2)) {
          setImmediate(push)
        } else if (!(chunks % 3)) {
          process.nextTick(push)
        } else {
          push()
        }
      }
      let totalPushed = 0
      function push() {
        const chunk = chunks-- > 0 ? Buffer.alloc(chunkSize, 'x') : null
        if (chunk) {
          totalPushed += chunk.length
        }
        silentConsole.log('chunks', chunks)
        r.push(chunk)
      }

      read100()

      // First we read 100 bytes.
      function read100() {
        readn(100, onData)
      }
      function readn(n: number, then: () => void) {
        silentConsole.error(`read ${n}`)
        expectEndingData -= n
        ;(function read() {
          const c = r.read(n) as Buffer | null
          silentConsole.error('c', c)
          if (!c) {
            r.once('readable', read)
          } else {
            expect(c.length).toBe(n)
            expect((r as unknown as { readableFlowing: boolean }).readableFlowing).toBeFalsy()
            then()
          }
        })()
      }

      // Then we listen to some data events.
      function onData() {
        expectEndingData -= 100
        silentConsole.error('onData')
        let seen = 0
        r.on('data', function od(c: Buffer) {
          seen += c.length
          if (seen >= 100) {
            // Seen enough
            r.removeListener('data', od as (...args: unknown[]) => void)
            r.pause()
            if (seen > 100) {
              // Oh no, seen too much!
              // Put the extra back.
              const diff = seen - 100
              r.unshift(c.slice(c.length - diff))
              silentConsole.error('seen too much', seen, diff)
            }

            // Nothing should be lost in-between.
            setImmediate(pipeLittle)
          }
        })
      }

      // Just pipe 200 bytes, then unshift the extra and unpipe.
      function pipeLittle() {
        expectEndingData -= 200
        silentConsole.error('pipe a little')
        const w = new Writable()
        let written = 0
        w.on('finish', () => {
          expect(written).toBe(200)
          setImmediate(read1234)
        })
        w._write = function (chunk: Buffer, _encoding: string, cb: () => void) {
          written += chunk.length
          if (written >= 200) {
            r.unpipe(w)
            w.end()
            cb()
            if (written > 200) {
              const diff = written - 200
              written -= diff
              r.unshift(chunk.slice(chunk.length - diff))
            }
          } else {
            setImmediate(cb)
          }
        }
        r.pipe(w)
      }

      // Now read 1234 more bytes.
      function read1234() {
        readn(1234, resumePause)
      }
      function resumePause() {
        silentConsole.error('resumePause')
        // Don't read anything, just resume and re-pause a whole bunch.
        r.resume()
        r.pause()
        r.resume()
        r.pause()
        r.resume()
        r.pause()
        r.resume()
        r.pause()
        r.resume()
        r.pause()
        setImmediate(pipe)
      }
      function pipe() {
        silentConsole.error('pipe the rest')
        const w = new Writable()
        let written = 0
        w._write = function (chunk: Buffer, _encoding: string, cb: () => void) {
          written += chunk.length
          cb()
        }
        w.on('finish', () => {
          silentConsole.error('written', written, totalPushed)
          expect(written).toBe(expectEndingData)
          expect(totalPushed).toBe(expectTotalData)
          silentConsole.log('ok')
          resolve()
        })
        r.pipe(w)
      }
    }))
})
