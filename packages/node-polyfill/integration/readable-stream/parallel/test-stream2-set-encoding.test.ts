import { describe, it, expect } from 'vitest'
import { mustCall } from '../common/index.ts'
import { Readable } from 'readable-stream'

class TestReader extends Readable {
  pos: number
  len: number
  constructor(n?: number, opts?: object) {
    super(opts)
    this.pos = 0
    this.len = n || 100
  }
  _read(n: number) {
    setTimeout(() => {
      if (this.pos >= this.len) {
        // Double push(null) to test eos handling
        this.push(null)
        return this.push(null)
      }
      n = Math.min(n, this.len - this.pos)
      if (n <= 0) {
        // Double push(null) to test eos handling
        this.push(null)
        return this.push(null)
      }
      this.pos += n
      const ret = Buffer.alloc(n, 'a')
      return this.push(ret)
    }, 1)
  }
}

describe('test-stream2-set-encoding', () => {
  it('should verify utf8 encoding via setEncoding', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100)
      tr.setEncoding('utf8')
      const out: string[] = []
      const expected = [
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify hex encoding', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100)
      tr.setEncoding('hex')
      const out: string[] = []
      const expected = [
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify hex encoding with read(13)', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100)
      tr.setEncoding('hex')
      const out: string[] = []
      const expected = [
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '16161'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(13))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify base64 encoding', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100)
      tr.setEncoding('base64')
      const out: string[] = []
      const expected = [
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYQ=='
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify utf8 encoding via constructor options', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100, {
        encoding: 'utf8'
      })
      const out: string[] = []
      const expected = [
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa',
        'aaaaaaaaaa'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify hex encoding via constructor options', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100, {
        encoding: 'hex'
      })
      const out: string[] = []
      const expected = [
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161',
        '6161616161'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify hex encoding with read(13) via constructor options', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100, {
        encoding: 'hex'
      })
      const out: string[] = []
      const expected = [
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '1616161616161',
        '6161616161616',
        '16161'
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(13))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify base64 encoding via constructor options', () =>
    new Promise<void>(resolve => {
      const tr = new TestReader(100, {
        encoding: 'base64'
      })
      const out: string[] = []
      const expected = [
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYWFhYWFh',
        'YWFhYWFhYW',
        'FhYQ=='
      ]
      tr.on('readable', function flow() {
        let chunk
        while (null !== (chunk = tr.read(10))) out.push(chunk as string)
      })
      tr.on(
        'end',
        mustCall(function () {
          expect(out).toEqual(expected)
          resolve()
        }) as (...args: unknown[]) => void
      )
    }))

  it('should verify chaining behavior', () => {
    const tr = new TestReader(100)
    expect(tr.setEncoding('utf8')).toEqual(tr)
  })
})
