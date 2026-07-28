import { describe, it, expect } from 'vite-plus/test'
import { Readable } from 'readable-stream'

describe('test-stream-readable-setEncoding-existing-buffers', () => {
  it('setEncoding while there are bytes already in the buffer', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      r.push(Buffer.from('a'))
      r.push(Buffer.from('b'))
      r.setEncoding('utf8')
      const chunks: string[] = []
      r.on('data', chunk => chunks.push(chunk as string))
      process.nextTick(() => {
        expect(chunks).toEqual(['ab'])
        resolve()
      })
    }))

  it('setEncoding while the buffer contains a complete but chunked character', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      r.push(Buffer.from([0xf0]))
      r.push(Buffer.from([0x9f]))
      r.push(Buffer.from([0x8e]))
      r.push(Buffer.from([0x89]))
      r.setEncoding('utf8')
      const chunks: string[] = []
      r.on('data', chunk => chunks.push(chunk as string))
      process.nextTick(() => {
        expect(chunks).toEqual(['\u{1F389}'])
        resolve()
      })
    }))

  it('setEncoding while the buffer contains an incomplete character', () =>
    new Promise<void>(resolve => {
      const r = new Readable({
        read() {}
      })
      r.push(Buffer.from([0xf0]))
      r.push(Buffer.from([0x9f]))
      r.setEncoding('utf8')
      r.push(Buffer.from([0x8e]))
      r.push(Buffer.from([0x89]))
      const chunks: string[] = []
      r.on('data', chunk => chunks.push(chunk as string))
      process.nextTick(() => {
        expect(chunks).toEqual(['\u{1F389}'])
        resolve()
      })
    }))
})
