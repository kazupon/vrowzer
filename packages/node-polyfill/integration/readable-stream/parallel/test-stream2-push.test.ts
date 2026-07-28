import { describe, it, expect } from 'vite-plus/test'
import { Readable, Writable } from 'readable-stream'
import EE from 'events'

describe('test-stream2-push', () => {
  it('should handle push with highWaterMark and back pressure', () =>
    new Promise<void>(resolve => {
      // A mock thing a bit like the net.Socket/tcp_wrap.handle interaction
      const stream = new Readable({
        highWaterMark: 16,
        encoding: 'utf8'
      })
      const source = new EE()

      stream._read = function () {
        readStart()
      }

      let ended = false
      stream.on('end', function () {
        ended = true
      })

      source.on('data', function (chunk) {
        const ret = stream.push(chunk)
        if (!ret) {
          readStop()
        }
      })

      source.on('end', function () {
        stream.push(null)
      })

      let reading = false
      function readStart() {
        reading = true
      }

      function readStop() {
        reading = false
        process.nextTick(function () {
          const r = stream.read()
          if (r !== null) {
            writer.write(r)
          }
        })
      }

      const writer = new Writable({
        decodeStrings: false
      })
      const written: string[] = []
      const expectWritten = [
        'asdfgasdfgasdfgasdfg',
        'asdfgasdfgasdfgasdfg',
        'asdfgasdfgasdfgasdfg',
        'asdfgasdfgasdfgasdfg',
        'asdfgasdfgasdfgasdfg',
        'asdfgasdfgasdfgasdfg'
      ]

      writer._write = function (chunk, _encoding, cb) {
        written.push(chunk as string)
        process.nextTick(cb)
      }

      writer.on('finish', function () {
        expect(written).toStrictEqual(expectWritten)
        resolve()
      })

      // Now emit some chunks.
      const chunk = 'asdfg'
      let set = 0
      readStart()
      data()

      function data() {
        expect(reading).toBe(true)
        source.emit('data', chunk)
        expect(reading).toBe(true)
        source.emit('data', chunk)
        expect(reading).toBe(true)
        source.emit('data', chunk)
        expect(reading).toBe(true)
        source.emit('data', chunk)
        expect(reading).toBe(false)
        if (set++ < 5) {
          setTimeout(data, 10)
        } else {
          end()
        }
      }

      function end() {
        source.emit('end')
        expect(reading).toBe(false)
        writer.end(stream.read())
        setImmediate(function () {
          expect(ended).toBe(true)
        })
      }
    }))
})
