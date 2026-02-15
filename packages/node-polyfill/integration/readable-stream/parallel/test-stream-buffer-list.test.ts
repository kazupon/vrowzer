import { describe, it, expect } from 'vitest'
// @ts-ignore -- internal module
import BufferList from 'readable-stream/lib/internal/streams/buffer_list'

describe('test-stream-buffer-list', () => {
  it('empty buffer list', () => {
    const emptyList = new BufferList()
    emptyList.shift()
    expect(emptyList).toStrictEqual(new BufferList())
    expect(emptyList.join(',')).toBe('')
    expect(emptyList.concat(0)).toStrictEqual(Buffer.alloc(0))
  })

  it('buffer list iterator with no elements', () => {
    const list = new BufferList()
    let len = 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _x of list) {
      len++
    }
    expect(len).toBe(0)
  })

  it('buffer list with one element', () => {
    const buf = Buffer.from('foo')
    const list = new BufferList()
    list.push(buf)

    let len = 0
    for (const x of list) {
      expect(x).toBe(buf)
      len++
    }
    expect(len).toBe(1)

    const copy = list.concat(3)
    expect(copy).not.toBe(buf)
    expect(copy).toStrictEqual(buf)
    expect(list.join(',')).toBe('foo')

    const shifted = list.shift()
    expect(shifted).toBe(buf)
    expect(list).toStrictEqual(new BufferList())
  })

  it('consume strings', () => {
    const list = new BufferList()
    list.push('foo')
    list.push('bar')
    list.push('foo')
    list.push('bar')
    expect(list.consume(6, true)).toBe('foobar')
    expect(list.consume(6, true)).toBe('foobar')
  })

  it('consume partial strings', () => {
    const list = new BufferList()
    list.push('foo')
    list.push('bar')
    expect(list.consume(5, true)).toBe('fooba')
  })

  it('consume buffers', () => {
    const buf = Buffer.from('foo')
    const list = new BufferList()
    list.push(buf)
    list.push(buf)
    list.push(buf)
    list.push(buf)
    expect(list.consume(6).toString()).toBe('foofoo')
    expect(list.consume(6).toString()).toBe('foofoo')
  })

  it('consume partial buffers', () => {
    const buf = Buffer.from('foo')
    const list = new BufferList()
    list.push(buf)
    list.push(buf)
    expect(list.consume(5).toString()).toBe('foofo')
  })
})
