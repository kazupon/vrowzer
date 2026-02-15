import { describe, it, expect } from 'vitest'
import { Readable } from 'readable-stream'
// @ts-ignore -- internal module
import BufferList from 'readable-stream/lib/internal/streams/buffer_list'

const fromList = (Readable as any)._fromList

function bufferListFromArray(arr: any[]) {
  const bl = new BufferList()
  for (let i = 0; i < arr.length; ++i) bl.push(arr[i])
  return bl
}

describe('test-stream2-readable-from-list', () => {
  it('should handle buffers - read more than first element', () => {
    let list = [Buffer.from('foog'), Buffer.from('bark'), Buffer.from('bazy'), Buffer.from('kuel')]
    const bl = bufferListFromArray(list)
    expect(typeof bl.head).toBe('object')
    expect(typeof bl.tail).toBe('object')
    expect(bl.length).toBe(4)

    const ret = fromList(6, {
      buffer: bl,
      length: 16
    })
    expect(ret.toString()).toBe('foogba')
  })

  it('should handle buffers - read exactly the first element', () => {
    let list = [Buffer.from('bark'), Buffer.from('bazy'), Buffer.from('kuel')]
    const bl = bufferListFromArray(list)
    const ret = fromList(2, {
      buffer: bl,
      length: 10
    })
    expect(ret.toString()).toBe('ba')
  })

  it('should handle buffers - read less than the first element', () => {
    let list = [Buffer.from('rk'), Buffer.from('bazy'), Buffer.from('kuel')]
    const bl = bufferListFromArray(list)
    const ret = fromList(2, {
      buffer: bl,
      length: 10
    })
    expect(ret.toString()).toBe('rk')
  })

  it('should handle buffers - read more than we have', () => {
    let list = [Buffer.from('bazy'), Buffer.from('kuel')]
    const bl = bufferListFromArray(list)
    const ret = fromList(100, {
      buffer: bl,
      length: 8
    })
    expect(ret.toString()).toBe('bazykuel')
  })

  it('should handle buffers - full sequence', () => {
    let list: Buffer[] | BufferList = [
      Buffer.from('foog'),
      Buffer.from('bark'),
      Buffer.from('bazy'),
      Buffer.from('kuel')
    ]
    list = bufferListFromArray(list)
    expect(typeof list.head).toBe('object')
    expect(typeof list.tail).toBe('object')
    expect(list.length).toBe(4)

    // Read more than the first element.
    let ret = fromList(6, { buffer: list, length: 16 })
    expect(ret.toString()).toBe('foogba')

    // Read exactly the first element.
    ret = fromList(2, { buffer: list, length: 10 })
    expect(ret.toString()).toBe('rk')

    // Read less than the first element.
    ret = fromList(2, { buffer: list, length: 8 })
    expect(ret.toString()).toBe('ba')

    // Read more than we have.
    ret = fromList(100, { buffer: list, length: 6 })
    expect(ret.toString()).toBe('zykuel')

    // all consumed.
    expect(list).toStrictEqual(new BufferList())
  })

  it('should handle strings', () => {
    let list: string[] | BufferList = ['foog', 'bark', 'bazy', 'kuel']
    list = bufferListFromArray(list)

    // Read more than the first element.
    let ret = fromList(6, { buffer: list, length: 16, decoder: true })
    expect(ret).toBe('foogba')

    // Read exactly the first element.
    ret = fromList(2, { buffer: list, length: 10, decoder: true })
    expect(ret).toBe('rk')

    // Read less than the first element.
    ret = fromList(2, { buffer: list, length: 8, decoder: true })
    expect(ret).toBe('ba')

    // Read more than we have.
    ret = fromList(100, { buffer: list, length: 6, decoder: true })
    expect(ret).toBe('zykuel')

    // all consumed.
    expect(list).toStrictEqual(new BufferList())
  })
})
