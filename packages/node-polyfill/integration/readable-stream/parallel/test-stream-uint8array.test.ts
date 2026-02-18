import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable, Writable } from 'readable-stream'

const ABC = new Uint8Array([0x41, 0x42, 0x43])
const DEF = new Uint8Array([0x44, 0x45, 0x46])
const GHI = new Uint8Array([0x47, 0x48, 0x49])

describe('test-stream-uint8array', () => {
  it('Simple Writable test', () =>
    new Promise<void>(resolve => {
      let n = 0
      const writable = new Writable({
        write: mustCall((chunk: Buffer, _encoding: string, cb: () => void) => {
          expect(chunk instanceof Buffer).toBe(true)
          if (n++ === 0) {
            expect(String(chunk)).toBe('ABC')
          } else {
            expect(String(chunk)).toBe('DEF')
          }
          cb()
          if (n === 2) {
            resolve()
          }
        }, 2) as (...args: unknown[]) => void
      })
      writable.write(ABC)
      writable.end(DEF)
    }))

  it('Writable test, pass in Uint8Array in object mode', () =>
    new Promise<void>(resolve => {
      const writable = new Writable({
        objectMode: true,
        write: mustCall((chunk: Uint8Array, encoding: string, cb: () => void) => {
          expect(chunk instanceof Buffer).toBe(false)
          expect(chunk instanceof Uint8Array).toBe(true)
          expect(chunk).toBe(ABC)
          expect(encoding).toBe('utf8')
          cb()
          resolve()
        }) as (...args: unknown[]) => void
      })
      writable.end(ABC)
    }))

  it('Writable test, multiple writes carried out via writev', () =>
    new Promise<void>(resolve => {
      let callback: () => void
      const writable = new Writable({
        write: mustCall((chunk: Buffer, encoding: string, cb: () => void) => {
          expect(chunk instanceof Buffer).toBe(true)
          expect(encoding).toBe('buffer')
          expect(String(chunk)).toBe('ABC')
          callback = cb
        }) as (...args: unknown[]) => void,
        writev: mustCall((chunks: Array<{ encoding: string; chunk: Buffer }>, _cb: () => void) => {
          expect(chunks.length).toBe(2)
          expect(chunks[0]!.encoding).toBe('buffer')
          expect(chunks[1]!.encoding).toBe('buffer')
          expect(chunks[0]!.chunk + '' + chunks[1]!.chunk).toBe('DEFGHI')
          resolve()
        }) as (...args: unknown[]) => void
      })
      writable.write(ABC)
      writable.write(DEF)
      writable.end(GHI)
      callback!()
    }))

  it('Simple Readable test', () => {
    const readable = new Readable({
      read() {}
    })
    readable.push(DEF)
    readable.unshift(ABC)
    const buf = readable.read() as Buffer
    expect(buf instanceof Buffer).toBe(true)
    expect([...buf]).toEqual([...ABC, ...DEF])
  })

  it('Readable test, setEncoding', () => {
    const readable = new Readable({
      read() {}
    })
    readable.setEncoding('utf8')
    readable.push(DEF)
    readable.unshift(ABC)
    const out = readable.read()
    expect(out).toBe('ABCDEF')
  })
})
