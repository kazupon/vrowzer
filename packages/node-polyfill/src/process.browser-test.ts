/**
 * process browser tests
 */

import { describe, expect, it, vi } from 'vitest'
import process, {
  chdir,
  cpuUsage,
  cwd,
  emitWarning,
  hrtime,
  memoryUsage,
  nextTick,
  resourceUsage,
  stderr,
  stdin,
  stdout,
  umask,
  uptime
} from './process.ts'

describe('properties', () => {
  it('title should be browser', () => {
    expect(process.title).toBe('browser')
  })

  it('browser should be true', () => {
    expect(process.browser).toBe(true)
  })

  it('platform should be a string', () => {
    expect(typeof process.platform).toBe('string')
  })

  it('env should be an object', () => {
    expect(typeof process.env).toBe('object')
  })

  it('argv should be an array', () => {
    expect(Array.isArray(process.argv)).toBe(true)
  })

  it('version should be a string', () => {
    expect(typeof process.version).toBe('string')
  })

  it('versions should be an object', () => {
    expect(typeof process.versions).toBe('object')
  })

  it('arch should be a string', () => {
    expect(typeof process.arch).toBe('string')
  })
})

describe('pid / ppid', () => {
  it('pid should be a number', () => {
    expect(typeof process.pid).toBe('number')
  })

  it('ppid should be a number', () => {
    expect(typeof process.ppid).toBe('number')
  })
})

describe('nextTick', () => {
  it('should execute callback asynchronously', async () => {
    const order: number[] = []
    nextTick(() => order.push(2))
    order.push(1)
    await new Promise(r => setTimeout(r, 10))
    expect(order).toEqual([1, 2])
  })

  it('should pass arguments to callback', async () => {
    const result = await new Promise<unknown[]>(resolve => {
      nextTick((...args: unknown[]) => resolve(args), 'a', 'b', 'c')
    })
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('should execute callbacks in order', async () => {
    const order: number[] = []
    nextTick(() => order.push(1))
    nextTick(() => order.push(2))
    nextTick(() => order.push(3))
    await new Promise(r => setTimeout(r, 10))
    expect(order).toEqual([1, 2, 3])
  })
})

describe('cwd / chdir', () => {
  it('cwd should return a string', () => {
    expect(typeof cwd()).toBe('string')
  })

  it('cwd should default to /', () => {
    chdir('/')
    expect(cwd()).toBe('/')
  })

  it('chdir should change cwd with absolute path', () => {
    chdir('/usr/local')
    expect(cwd()).toBe('/usr/local')
    chdir('/')
  })

  it('chdir should change cwd with relative path', () => {
    chdir('/')
    chdir('src')
    expect(cwd()).toBe('/src')
    chdir('/')
  })

  it('chdir should throw on non-string', () => {
    expect(() => chdir(123 as unknown as string)).toThrow(TypeError)
  })
})

describe('hrtime', () => {
  it('should return [seconds, nanoseconds]', () => {
    const result = hrtime()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(typeof result[0]).toBe('number')
    expect(typeof result[1]).toBe('number')
  })

  it('should return difference when given previous time', () => {
    const start = hrtime()
    const diff = hrtime(start)
    expect(diff[0]).toBeGreaterThanOrEqual(0)
  })

  it('bigint should return a BigInt', () => {
    const result = hrtime.bigint()
    expect(typeof result).toBe('bigint')
  })
})

describe('uptime', () => {
  it('should return a non-negative number', () => {
    expect(uptime()).toBeGreaterThanOrEqual(0)
  })
})

describe('umask', () => {
  it('should return 0', () => {
    expect(umask()).toBe(0)
  })
})

describe('stdout / stderr / stdin', () => {
  it('stdout should have isTTY property', () => {
    expect(typeof stdout.isTTY).toBe('boolean')
  })

  it('stdout should have rows and columns', () => {
    expect(typeof stdout.rows).toBe('number')
    expect(typeof stdout.columns).toBe('number')
  })

  it('stdout.write should not throw', () => {
    expect(() => stdout.write()).not.toThrow()
  })

  it('stderr should have isTTY property', () => {
    expect(typeof stderr.isTTY).toBe('boolean')
  })

  it('stdin should have isTTY property', () => {
    expect(typeof stdin.isTTY).toBe('boolean')
  })
})

describe('exit / kill / abort', () => {
  it('exit should not throw', () => {
    expect(() => process.exit()).not.toThrow()
  })

  it('kill should not throw', () => {
    expect(() => process.kill()).not.toThrow()
  })

  it('abort should not throw', () => {
    expect(() => process.abort()).not.toThrow()
  })
})

describe('memoryUsage', () => {
  it('should return an object with expected properties', () => {
    const mem = memoryUsage()
    expect(mem).toHaveProperty('rss')
    expect(mem).toHaveProperty('heapTotal')
    expect(mem).toHaveProperty('heapUsed')
    expect(mem).toHaveProperty('external')
    expect(mem).toHaveProperty('arrayBuffers')
  })

  it('rss() should return a number', () => {
    expect(typeof memoryUsage.rss()).toBe('number')
  })
})

describe('cpuUsage', () => {
  it('should return user and system', () => {
    const usage = cpuUsage()
    expect(usage).toHaveProperty('user')
    expect(usage).toHaveProperty('system')
    expect(typeof usage.user).toBe('number')
    expect(typeof usage.system).toBe('number')
  })
})

describe('resourceUsage', () => {
  it('should return an object with numeric values', () => {
    const usage = resourceUsage()
    expect(typeof usage).toBe('object')
    for (const value of Object.values(usage)) {
      expect(typeof value).toBe('number')
    }
  })
})

describe('emitWarning', () => {
  it('should not throw', () => {
    expect(() => emitWarning('test warning')).not.toThrow()
  })

  it('should call console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    emitWarning('test')
    expect(spy).toHaveBeenCalledWith('test')
    spy.mockRestore()
  })
})

describe('event methods', () => {
  it('on should not throw', () => {
    expect(() => process.on('exit', () => {})).not.toThrow()
  })

  it('off should not throw', () => {
    expect(() => process.off('exit', () => {})).not.toThrow()
  })

  it('once should not throw', () => {
    expect(() => process.once('exit', () => {})).not.toThrow()
  })

  it('emit should not throw', () => {
    expect(() => process.emit('exit')).not.toThrow()
  })

  it('removeAllListeners should not throw', () => {
    expect(() => process.removeAllListeners()).not.toThrow()
  })
})

describe('getuid / getgid / getgroups', () => {
  it('getuid should return a number', () => {
    expect(typeof process.getuid()).toBe('number')
  })

  it('getgid should return a number', () => {
    expect(typeof process.getgid()).toBe('number')
  })

  it('getgroups should return an array', () => {
    expect(Array.isArray(process.getgroups())).toBe(true)
  })
})

describe('misc properties', () => {
  it('debugPort should be a number', () => {
    expect(typeof process.debugPort).toBe('number')
  })

  it('allowedNodeEnvironmentFlags should be a Set', () => {
    expect(process.allowedNodeEnvironmentFlags).toBeInstanceOf(Set)
  })

  it('exitCode should be undefined', () => {
    expect(process.exitCode).toBeUndefined()
  })

  it('execPath should be a string', () => {
    expect(typeof process.execPath).toBe('string')
  })

  it('execArgv should be an array', () => {
    expect(Array.isArray(process.execArgv)).toBe(true)
  })
})

describe('binding', () => {
  it('should throw', () => {
    expect(() => process.binding('test')).toThrow()
  })
})
