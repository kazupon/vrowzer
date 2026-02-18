import { describe, it, expect } from 'vitest'
import { mustCall, mustNotCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'
import EE from 'events'

class TestReader extends Readable {
  _buffer: Buffer
  _pos: number
  _bufs: number
  ended: boolean

  constructor(n?: number) {
    super()
    this._buffer = Buffer.alloc(n || 100, 'x')
    this._pos = 0
    this._bufs = 10
    this.ended = false
  }

  _read(n: number) {
    const max = this._buffer.length - this._pos
    n = Math.max(n, 0)
    const toRead = Math.min(n, max)
    if (toRead === 0) {
      setTimeout(() => {
        this._pos = 0
        this._bufs -= 1
        if (this._bufs <= 0) {
          if (!this.ended) {
            this.push(null)
          }
        } else {
          this._read(n)
        }
      }, 10)
      return
    }
    const ret = this._buffer.slice(this._pos, this._pos + toRead)
    this._pos += toRead
    this.push(ret)
  }
}

class TestWriter extends EE {
  received: string[]
  flush: boolean

  constructor() {
    super()
    this.received = []
    this.flush = false
  }

  write(c: any) {
    this.received.push(c.toString())
    this.emit('write', c)
    return true
  }

  end(c?: any) {
    if (c) {
      this.write(c)
    }
    this.emit('end', this.received)
  }
}

describe('test-stream2-basic', () => {
  it('should handle basic read functionality', () =>
    new Promise<void>(resolve => {
      const r = new TestReader(20)
      const reads: string[] = []
      const expected = [
        'x',
        'xx',
        'xxx',
        'xxxx',
        'xxxxx',
        'xxxxxxxxx',
        'xxxxxxxxxx',
        'xxxxxxxxxxxx',
        'xxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxxxxxxxx',
        'xxxxxxxxxxxxxxxxxxxxx'
      ]

      r.on(
        'end',
        mustCall(function () {
          expect(reads).toStrictEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )

      let readSize = 1
      function flow() {
        let res
        while (null !== (res = r.read(readSize++))) {
          reads.push(res.toString())
        }
        r.once('readable', flow)
      }
      flow()
    }))

  it('should verify pipe', () =>
    new Promise<void>(resolve => {
      const r = new TestReader(5)
      const expected = [
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx'
      ]
      const w = new TestWriter()
      w.on(
        'end',
        mustCall(function (received: string[]) {
          expect(received).toStrictEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
      r.pipe(w as any)
    }))

  it('should verify unpipe (SPLIT=1)', () => testUnpipe(1))
  it('should verify unpipe (SPLIT=2)', () => testUnpipe(2))
  it('should verify unpipe (SPLIT=3)', () => testUnpipe(3))
  it('should verify unpipe (SPLIT=4)', () => testUnpipe(4))
  it('should verify unpipe (SPLIT=5)', () => testUnpipe(5))
  it('should verify unpipe (SPLIT=6)', () => testUnpipe(6))
  it('should verify unpipe (SPLIT=7)', () => testUnpipe(7))
  it('should verify unpipe (SPLIT=8)', () => testUnpipe(8))
  it('should verify unpipe (SPLIT=9)', () => testUnpipe(9))

  it('should verify both writers get the same data when piping', () =>
    new Promise<void>(resolve => {
      const r = new TestReader(5)
      const w = [new TestWriter(), new TestWriter()]
      const expected = [
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx',
        'xxxxx'
      ]
      let finished = 0
      w[0]!.on(
        'end',
        mustCall(function (received: string[]) {
          expect(received).toStrictEqual(expected)
          if (++finished === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
      w[1]!.on(
        'end',
        mustCall(function (received: string[]) {
          expect(received).toStrictEqual(expected)
          if (++finished === 2) {
            resolve()
          }
        }) as (...args: unknown[]) => void
      )
      r.pipe(w[0] as any)
      r.pipe(w[1] as any)
    }))

  it('should verify multi-unpipe (SPLIT=1)', () => testMultiUnpipe(1))
  it('should verify multi-unpipe (SPLIT=2)', () => testMultiUnpipe(2))
  it('should verify multi-unpipe (SPLIT=3)', () => testMultiUnpipe(3))
  it('should verify multi-unpipe (SPLIT=4)', () => testMultiUnpipe(4))
  it('should verify multi-unpipe (SPLIT=5)', () => testMultiUnpipe(5))
  it('should verify multi-unpipe (SPLIT=6)', () => testMultiUnpipe(6))
  it('should verify multi-unpipe (SPLIT=7)', () => testMultiUnpipe(7))
  it('should verify multi-unpipe (SPLIT=8)', () => testMultiUnpipe(8))
  it('should verify multi-unpipe (SPLIT=9)', () => testMultiUnpipe(9))

  it('should verify back pressure is respected', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ objectMode: true })
      r._read = mustNotCall() as () => void
      let counter = 0
      r.push(['one'])
      r.push(['two'])
      r.push(['three'])
      r.push(['four'])
      r.push(null)

      const w1 = new Readable() as any
      w1.write = function (chunk: any) {
        expect(chunk[0]).toBe('one')
        w1.emit('close')
        process.nextTick(function () {
          r.pipe(w2)
          r.pipe(w3)
        })
      }
      w1.end = mustNotCall() as (...args: unknown[]) => void
      r.pipe(w1)

      const expectedArr = ['two', 'two', 'three', 'three', 'four', 'four']
      const w2 = new Readable() as any
      w2.write = function (chunk: any) {
        expect(chunk[0]).toBe(expectedArr.shift())
        expect(counter).toBe(0)
        counter++
        if (chunk[0] === 'four') {
          return true
        }
        setTimeout(function () {
          counter--
          w2.emit('drain')
        }, 10)
        return false
      }
      w2.end = mustCall() as (...args: unknown[]) => void

      const w3 = new Readable() as any
      w3.write = function (chunk: any) {
        expect(chunk[0]).toBe(expectedArr.shift())
        expect(counter).toBe(1)
        counter++
        if (chunk[0] === 'four') {
          return true
        }
        setTimeout(function () {
          counter--
          w3.emit('drain')
        }, 50)
        return false
      }
      w3.end = mustCall(function () {
        expect(counter).toBe(2)
        expect(expectedArr.length).toBe(0)
        resolve()
      }) as (...args: unknown[]) => void
    }))

  it('should verify read(0) behavior for ended streams', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      let written = false
      let ended = false
      r._read = mustNotCall() as () => void
      r.push(Buffer.from('foo'))
      r.push(null)

      const v = r.read(0)
      expect(v).toBe(null)

      const w = new Readable() as any
      w.write = function (buffer: any) {
        written = true
        expect(ended).toBe(false)
        expect(buffer.toString()).toBe('foo')
      }
      w.end = mustCall(function () {
        ended = true
        expect(written).toBe(true)
        resolve()
      }) as (...args: unknown[]) => void
      r.pipe(w)
    }))

  it('should verify synchronous _read ending', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      let called = false
      r._read = function () {
        r.push(null)
      }
      r.once('end', function () {
        called = true
      })
      r.read()
      process.nextTick(function () {
        expect(called).toBe(true)
        resolve()
      })
    }))

  it('should verify that adding readable listeners triggers data flow', () =>
    new Promise<void>(resolve => {
      const r = new Readable({ highWaterMark: 5 })
      let onReadable = false
      let readCalled = 0
      r._read = function () {
        if (readCalled++ === 2) {
          r.push(null)
        } else {
          r.push(Buffer.from('asdf'))
        }
      }
      r.on('readable', function () {
        onReadable = true
        r.read()
      })
      r.on(
        'end',
        mustCall(function () {
          expect(readCalled).toBe(3)
          expect(onReadable).toBe(true)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify that streams are chainable', () =>
    new Promise<void>(resolve => {
      const r = new Readable()
      let readCalled = false
      r._read = function () {
        readCalled = true
      }
      const r2 = r.setEncoding('utf8').pause().resume().pause()
      expect(r).toBe(r2)
      // _read is called asynchronously after resume(), so wait for it
      setTimeout(() => {
        expect(readCalled).toBe(true)
        resolve()
      }, 50)
    }))

  it('should verify readableEncoding property', () => {
    expect(Reflect.has(Readable.prototype, 'readableEncoding')).toBe(true)
    const r = new Readable({ encoding: 'utf8' })
    expect(r.readableEncoding).toBe('utf8')
  })

  it('should verify readableObjectMode property', () => {
    expect(Reflect.has(Readable.prototype, 'readableObjectMode')).toBe(true)
    const r = new Readable({ objectMode: true })
    expect(r.readableObjectMode).toBe(true)
  })

  it('should verify writableObjectMode property', () => {
    expect(Reflect.has(Writable.prototype, 'writableObjectMode')).toBe(true)
    const w = new Writable({ objectMode: true })
    expect(w.writableObjectMode).toBe(true)
  })
})

function testUnpipe(SPLIT: number) {
  return new Promise<void>(resolve => {
    const r = new TestReader(5)
    const allData = [
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx'
    ]
    const expected = [allData.slice(0, SPLIT), allData.slice(SPLIT)]
    const w = [new TestWriter(), new TestWriter()]
    let writes = SPLIT

    w[0]!.on('write', function () {
      if (--writes === 0) {
        r.unpipe()
        expect((r as any)._readableState.pipes).toStrictEqual([])
        w[0]!.end()
        r.pipe(w[1] as any)
        expect((r as any)._readableState.pipes).toStrictEqual([w[1]])
      }
    })

    let ended = 0
    w[0]!.on(
      'end',
      mustCall(function (results: string[]) {
        ended++
        expect(ended).toBe(1)
        expect(results).toStrictEqual(expected[0])
      }) as (...args: unknown[]) => void
    )
    w[1]!.on(
      'end',
      mustCall(function (results: string[]) {
        ended++
        expect(ended).toBe(2)
        expect(results).toStrictEqual(expected[1])
        resolve()
      }) as (...args: unknown[]) => void
    )
    r.pipe(w[0] as any)
  })
}

function testMultiUnpipe(SPLIT: number) {
  return new Promise<void>(resolve => {
    const r = new TestReader(5)
    const allData = [
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx'
    ]
    const expected = [allData.slice(0, SPLIT), allData.slice(SPLIT)]
    const w = [new TestWriter(), new TestWriter(), new TestWriter()]
    let writes = SPLIT

    w[0]!.on('write', function () {
      if (--writes === 0) {
        r.unpipe()
        w[0]!.end()
        r.pipe(w[1] as any)
      }
    })

    let ended = 0
    w[0]!.on(
      'end',
      mustCall(function (results: string[]) {
        ended++
        expect(ended).toBe(1)
        expect(results).toStrictEqual(expected[0])
      }) as (...args: unknown[]) => void
    )
    w[1]!.on(
      'end',
      mustCall(function (results: string[]) {
        ended++
        expect(ended).toBe(2)
        expect(results).toStrictEqual(expected[1])
        resolve()
      }) as (...args: unknown[]) => void
    )
    r.pipe(w[0] as any)
    r.pipe(w[2] as any)
  })
}
