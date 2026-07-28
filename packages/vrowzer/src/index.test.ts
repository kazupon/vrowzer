import { describe, expect, test } from 'vite-plus/test'
import { Vrowzer } from './index.ts'

describe('Vrowzer factory', () => {
  test('returns frozen object', () => {
    const vrowzer = Vrowzer()
    expect(Object.isFrozen(vrowzer)).toBe(true)
  })

  test('returns object with all Vrowzer interface methods', () => {
    const vrowzer = Vrowzer()
    expect(vrowzer.ready).toBeTypeOf('function')
    expect(vrowzer.mount).toBeTypeOf('function')
    expect(vrowzer.reloadPreview).toBeTypeOf('function')
    expect(vrowzer.addFile).toBeTypeOf('function')
    expect(vrowzer.updateFile).toBeTypeOf('function')
    expect(vrowzer.deleteFile).toBeTypeOf('function')
  })

  test('returns object with Emittable methods', () => {
    const vrowzer = Vrowzer()
    expect(vrowzer.on).toBeTypeOf('function')
    expect(vrowzer.off).toBeTypeOf('function')
    expect(vrowzer.once).toBeTypeOf('function')
    expect(vrowzer.emit).toBeTypeOf('function')
    expect(vrowzer.dispose).toBeTypeOf('function')
  })
})

describe('Vrowzer events', () => {
  test('on() returns a stop function', () => {
    const vrowzer = Vrowzer()
    const stop = vrowzer.on('progress', () => {})
    expect(stop).toBeTypeOf('function')
    stop()
  })

  test('on() receives emitted events', () => {
    const vrowzer = Vrowzer()
    const received: string[] = []
    vrowzer.on('progress', phase => {
      received.push(phase)
    })
    vrowzer.emit('progress', 'registering')
    vrowzer.emit('progress', 'registered')
    expect(received).toEqual(['registering', 'registered'])
  })

  test('once() receives event only once', () => {
    const vrowzer = Vrowzer()
    let count = 0
    vrowzer.once('progress', () => {
      count++
    })
    vrowzer.emit('progress', 'first')
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('stop function unregisters handler', () => {
    const vrowzer = Vrowzer()
    let count = 0
    const stop = vrowzer.on('progress', () => {
      count++
    })
    vrowzer.emit('progress', 'first')
    stop()
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('off() unregisters handler', () => {
    const vrowzer = Vrowzer()
    let count = 0
    const handler = () => {
      count++
    }
    vrowzer.on('progress', handler)
    vrowzer.emit('progress', 'first')
    vrowzer.off('progress', handler)
    vrowzer.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('dispose() clears all handlers', () => {
    const vrowzer = Vrowzer()
    let count = 0
    vrowzer.on('progress', () => {
      count++
    })
    vrowzer.on('suspended', () => {
      count++
    })
    vrowzer.emit('progress', 'test')
    expect(count).toBe(1)
    vrowzer.dispose()
    vrowzer.emit('progress', 'after-dispose')
    vrowzer.emit('suspended')
    expect(count).toBe(1)
  })
})
