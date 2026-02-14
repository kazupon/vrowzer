/**
 * os browser tests
 *
 * Based on Node.js test files in https://github.com/nodejs/node/tree/main/test/parallel
 * - test-os-eol.js
 * - test-os-fast.js
 * - test-os-process-priority.js
 * - test-os-constants-signals.js
 */

import { describe, expect, it } from 'vitest'
import {
  EOL,
  arch,
  availableParallelism,
  constants,
  cpus,
  devNull,
  endianness,
  freemem,
  getPriority,
  homedir,
  hostname,
  loadavg,
  machine,
  networkInterfaces,
  platform,
  release,
  setPriority,
  tmpdir,
  totalmem,
  type,
  uptime,
  userInfo,
  version
} from './os.ts'

describe('endianness', () => {
  it('should return BE or LE', () => {
    const result = endianness()
    expect(['BE', 'LE']).toContain(result)
  })

  it('should return consistent results', () => {
    expect(endianness()).toBe(endianness())
  })
})

describe('hostname', () => {
  it('should return a string', () => {
    expect(typeof hostname()).toBe('string')
  })
})

describe('loadavg', () => {
  it('should return an array of 3 numbers', () => {
    const result = loadavg()
    expect(result).toHaveLength(3)
    expect(typeof result[0]).toBe('number')
    expect(typeof result[1]).toBe('number')
    expect(typeof result[2]).toBe('number')
  })
})

describe('uptime', () => {
  it('should return a number', () => {
    expect(typeof uptime()).toBe('number')
  })
})

describe('freemem / totalmem', () => {
  it('freemem should return a positive number', () => {
    expect(freemem()).toBeGreaterThan(0)
  })

  it('totalmem should return a positive number', () => {
    expect(totalmem()).toBeGreaterThan(0)
  })
})

describe('cpus', () => {
  it('should return an array', () => {
    expect(Array.isArray(cpus())).toBe(true)
  })
})

describe('type', () => {
  it('should return a string', () => {
    expect(typeof type()).toBe('string')
  })

  it('should return Browser', () => {
    expect(type()).toBe('Browser')
  })
})

describe('release', () => {
  it('should return a string', () => {
    expect(typeof release()).toBe('string')
  })
})

describe('networkInterfaces', () => {
  it('should return an object', () => {
    expect(typeof networkInterfaces()).toBe('object')
  })
})

describe('arch', () => {
  it('should return a string', () => {
    expect(typeof arch()).toBe('string')
  })

  it('should return javascript', () => {
    expect(arch()).toBe('javascript')
  })
})

describe('platform', () => {
  it('should return a string', () => {
    expect(typeof platform()).toBe('string')
  })

  it('should return browser', () => {
    expect(platform()).toBe('browser')
  })
})

describe('tmpdir', () => {
  it('should return a string', () => {
    expect(typeof tmpdir()).toBe('string')
  })

  it('should return /tmp', () => {
    expect(tmpdir()).toBe('/tmp')
  })
})

describe('homedir', () => {
  it('should return a string', () => {
    expect(typeof homedir()).toBe('string')
  })
})

describe('EOL', () => {
  it('should be a newline character', () => {
    expect(EOL).toBe('\n')
  })
})

describe('availableParallelism', () => {
  it('should return a positive integer', () => {
    const result = availableParallelism()
    expect(result).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(result)).toBe(true)
  })
})

describe('version', () => {
  it('should return a string', () => {
    expect(typeof version()).toBe('string')
  })
})

describe('machine', () => {
  it('should return a string', () => {
    expect(typeof machine()).toBe('string')
  })
})

describe('devNull', () => {
  it('should be /dev/null', () => {
    expect(devNull).toBe('/dev/null')
  })
})

describe('constants', () => {
  it('should have signals property', () => {
    expect(constants).toHaveProperty('signals')
    expect(typeof constants.signals).toBe('object')
  })

  it('should have errno property', () => {
    expect(constants).toHaveProperty('errno')
    expect(typeof constants.errno).toBe('object')
  })

  it('should be frozen', () => {
    expect(Object.isFrozen(constants)).toBe(true)
  })
})

describe('getPriority / setPriority stubs', () => {
  it('getPriority should return 0', () => {
    expect(getPriority()).toBe(0)
  })

  it('getPriority should accept pid argument without throwing', () => {
    expect(() => getPriority(1)).not.toThrow()
  })

  it('setPriority should not throw', () => {
    expect(() => setPriority(0)).not.toThrow()
    expect(() => setPriority(1, 0)).not.toThrow()
  })
})

describe('userInfo stub', () => {
  it('should return an object with expected properties', () => {
    const info = userInfo()
    expect(info).toHaveProperty('uid')
    expect(info).toHaveProperty('gid')
    expect(info).toHaveProperty('username')
    expect(info).toHaveProperty('homedir')
    expect(info).toHaveProperty('shell')
  })

  it('should return default values', () => {
    const info = userInfo()
    expect(info.uid).toBe(-1)
    expect(info.gid).toBe(-1)
    expect(typeof info.username).toBe('string')
    expect(typeof info.homedir).toBe('string')
  })

  it('should accept options without throwing', () => {
    expect(() => userInfo({ encoding: 'utf-8' })).not.toThrow()
  })
})
