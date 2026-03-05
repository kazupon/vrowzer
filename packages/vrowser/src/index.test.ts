import { describe, expect, test } from 'vitest'
import { Vrowser } from './index.ts'

describe('Vrowser factory', () => {
  test('returns frozen object', () => {
    const vrowser = Vrowser()
    expect(Object.isFrozen(vrowser)).toBe(true)
  })

  test('returns object with all Vrowser interface methods', () => {
    const vrowser = Vrowser()
    expect(vrowser.ready).toBeTypeOf('function')
    expect(vrowser.mount).toBeTypeOf('function')
    expect(vrowser.reloadPreview).toBeTypeOf('function')
    expect(vrowser.addFile).toBeTypeOf('function')
    expect(vrowser.updateFile).toBeTypeOf('function')
    expect(vrowser.deleteFile).toBeTypeOf('function')
  })

  test('returns object with Emittable methods', () => {
    const vrowser = Vrowser()
    expect(vrowser.on).toBeTypeOf('function')
    expect(vrowser.off).toBeTypeOf('function')
    expect(vrowser.once).toBeTypeOf('function')
    expect(vrowser.emit).toBeTypeOf('function')
    expect(vrowser.dispose).toBeTypeOf('function')
  })
})

describe('Vrowser events', () => {
  test('on() returns a stop function', () => {
    const vrowser = Vrowser()
    const stop = vrowser.on('progress', () => {})
    expect(stop).toBeTypeOf('function')
    stop()
  })

  test('on() receives emitted events', () => {
    const vrowser = Vrowser()
    const received: string[] = []
    vrowser.on('progress', phase => {
      received.push(phase)
    })
    vrowser.emit('progress', 'registering')
    vrowser.emit('progress', 'registered')
    expect(received).toEqual(['registering', 'registered'])
  })

  test('once() receives event only once', () => {
    const vrowser = Vrowser()
    let count = 0
    vrowser.once('progress', () => {
      count++
    })
    vrowser.emit('progress', 'first')
    vrowser.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('stop function unregisters handler', () => {
    const vrowser = Vrowser()
    let count = 0
    const stop = vrowser.on('progress', () => {
      count++
    })
    vrowser.emit('progress', 'first')
    stop()
    vrowser.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('off() unregisters handler', () => {
    const vrowser = Vrowser()
    let count = 0
    const handler = () => {
      count++
    }
    vrowser.on('progress', handler)
    vrowser.emit('progress', 'first')
    vrowser.off('progress', handler)
    vrowser.emit('progress', 'second')
    expect(count).toBe(1)
  })

  test('dispose() clears all handlers', () => {
    const vrowser = Vrowser()
    let count = 0
    vrowser.on('progress', () => {
      count++
    })
    vrowser.on('suspended', () => {
      count++
    })
    vrowser.emit('progress', 'test')
    expect(count).toBe(1)
    vrowser.dispose()
    vrowser.emit('progress', 'after-dispose')
    vrowser.emit('suspended')
    expect(count).toBe(1)
  })
})
