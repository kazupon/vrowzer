/**
 * dns browser tests
 */

import { describe, expect, it } from 'vite-plus/test'
import {
  ADDRCONFIG,
  ADDRGETNETWORKPARAMS,
  ALL,
  BADFAMILY,
  BADFLAGS,
  BADHINTS,
  BADNAME,
  BADQUERY,
  BADRESP,
  BADSTR,
  CANCELLED,
  CONNREFUSED,
  DESTRUCTION,
  EOF,
  FILE,
  FORMERR,
  LOADIPHLPAPI,
  NODATA,
  NOMEM,
  NONAME,
  NOTFOUND,
  NOTIMP,
  NOTINITIALIZED,
  REFUSED,
  Resolver,
  SERVFAIL,
  TIMEOUT,
  V4MAPPED,
  getDefaultResultOrder,
  getServers,
  lookup,
  lookupService,
  promises,
  resolve,
  resolve4,
  resolve6,
  resolveAny,
  resolveCaa,
  resolveCname,
  resolveMx,
  resolveNaptr,
  resolveNs,
  resolvePtr,
  resolveSoa,
  resolveSrv,
  resolveTlsa,
  resolveTxt,
  reverse,
  setDefaultResultOrder,
  setServers
} from './dns.ts'

describe('error code constants', () => {
  it('should export all 23 error codes as strings', () => {
    expect(NODATA).toBe('ENODATA')
    expect(FORMERR).toBe('EFORMERR')
    expect(SERVFAIL).toBe('ESERVFAIL')
    expect(NOTFOUND).toBe('ENOTFOUND')
    expect(NOTIMP).toBe('ENOTIMP')
    expect(REFUSED).toBe('EREFUSED')
    expect(BADQUERY).toBe('EBADQUERY')
    expect(BADNAME).toBe('EBADNAME')
    expect(BADFAMILY).toBe('EBADFAMILY')
    expect(BADRESP).toBe('EBADRESP')
    expect(CONNREFUSED).toBe('ECONNREFUSED')
    expect(TIMEOUT).toBe('ETIMEOUT')
    expect(EOF).toBe('EOF')
    expect(FILE).toBe('EFILE')
    expect(NOMEM).toBe('ENOMEM')
    expect(DESTRUCTION).toBe('EDESTRUCTION')
    expect(BADSTR).toBe('EBADSTR')
    expect(BADFLAGS).toBe('EBADFLAGS')
    expect(NONAME).toBe('ENONAME')
    expect(BADHINTS).toBe('EBADHINTS')
    expect(NOTINITIALIZED).toBe('ENOTINITIALIZED')
    expect(LOADIPHLPAPI).toBe('ELOADIPHLPAPI')
    expect(ADDRGETNETWORKPARAMS).toBe('EADDRGETNETWORKPARAMS')
    expect(CANCELLED).toBe('ECANCELLED')
  })
})

describe('hint constants', () => {
  it('should export hint constants as numbers', () => {
    expect(typeof ADDRCONFIG).toBe('number')
    expect(typeof ALL).toBe('number')
    expect(typeof V4MAPPED).toBe('number')
  })
})

describe('lookup (callback)', () => {
  it('should call callback with address and family', async () => {
    await new Promise<void>(done => {
      lookup('localhost', (err, address, family) => {
        expect(err).toBeNull()
        expect(typeof address).toBe('string')
        expect(typeof family).toBe('number')
        done()
      })
    })
  })

  it('should support options with all: true', async () => {
    await new Promise<void>(done => {
      lookup(
        'localhost',
        { all: true },
        // @ts-expect-error -- ignore
        (err: Error | null, addresses: unknown) => {
          expect(err).toBeNull()
          expect(Array.isArray(addresses)).toBe(true)
          done()
        }
      )
    })
  })
})

describe('lookupService (callback)', () => {
  it('should call callback with hostname and service', async () => {
    await new Promise<void>(done => {
      lookupService('127.0.0.1', 80, (err, hostname, service) => {
        expect(err).toBeNull()
        expect(typeof hostname).toBe('string')
        expect(typeof service).toBe('string')
        done()
      })
    })
  })
})

describe('resolve functions (callback)', () => {
  it('resolve should call callback with empty array', async () => {
    await new Promise<void>(done => {
      resolve('example.com', (err, records) => {
        expect(err).toBeNull()
        expect(records).toEqual([])
        done()
      })
    })
  })

  it('resolve4 should call callback', async () => {
    await new Promise<void>(done => {
      resolve4('example.com', (err: Error | null, records: unknown[]) => {
        expect(err).toBeNull()
        expect(Array.isArray(records)).toBe(true)
        done()
      })
    })
  })

  it('resolve6 should call callback', async () => {
    await new Promise<void>(done => {
      resolve6('example.com', (err: Error | null, records: unknown[]) => {
        expect(err).toBeNull()
        expect(Array.isArray(records)).toBe(true)
        done()
      })
    })
  })

  const resolveFns = [
    ['resolveAny', resolveAny],
    ['resolveCaa', resolveCaa],
    ['resolveCname', resolveCname],
    ['resolveMx', resolveMx],
    ['resolveNaptr', resolveNaptr],
    ['resolveNs', resolveNs],
    ['resolvePtr', resolvePtr],
    ['resolveSoa', resolveSoa],
    ['resolveSrv', resolveSrv],
    ['resolveTlsa', resolveTlsa],
    ['resolveTxt', resolveTxt]
  ] as const

  for (const [name, fn] of resolveFns) {
    it(`${name} should call callback`, async () => {
      await new Promise<void>(done => {
        // @ts-expect-error -- ignore
        fn('example.com', (err: Error | null, records: unknown[]) => {
          expect(err).toBeNull()
          expect(Array.isArray(records)).toBe(true)
          done()
        })
      })
    })
  }

  it('reverse should call callback with empty array', async () => {
    await new Promise<void>(done => {
      reverse('127.0.0.1', (err, hostnames) => {
        expect(err).toBeNull()
        expect(hostnames).toEqual([])
        done()
      })
    })
  })
})

describe('getServers / setServers', () => {
  it('getServers should return an empty array', () => {
    expect(getServers()).toEqual([])
  })

  it('setServers should not throw', () => {
    expect(() => setServers(['8.8.8.8'])).not.toThrow()
  })
})

describe('getDefaultResultOrder / setDefaultResultOrder', () => {
  it('should return verbatim by default', () => {
    expect(getDefaultResultOrder()).toBe('verbatim')
  })

  it('should accept new order', () => {
    setDefaultResultOrder('ipv4first')
    expect(getDefaultResultOrder()).toBe('ipv4first')
    setDefaultResultOrder('verbatim')
  })
})

describe('Resolver class', () => {
  it('should be constructable', () => {
    const resolver = new Resolver()
    expect(resolver).toBeInstanceOf(Resolver)
  })

  it('cancel should not throw', () => {
    const resolver = new Resolver()
    expect(() => resolver.cancel()).not.toThrow()
  })

  it('setLocalAddress should not throw', () => {
    const resolver = new Resolver()
    expect(() => resolver.setLocalAddress('0.0.0.0')).not.toThrow()
  })

  it('getServers should return empty array', () => {
    const resolver = new Resolver()
    expect(resolver.getServers()).toEqual([])
  })

  it('resolve should call callback', async () => {
    const resolver = new Resolver()
    await new Promise<void>(done => {
      // @ts-expect-error -- ignore
      resolver.resolve('example.com', (err: Error | null, records: unknown[]) => {
        expect(err).toBeNull()
        expect(records).toEqual([])
        done()
      })
    })
  })
})

describe('promises API', () => {
  it('lookup should return a promise', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.lookup('localhost')
    expect(result).toHaveProperty('address')
    expect(result).toHaveProperty('family')
  })

  it('lookup with all: true should return array', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.lookup('localhost', { all: true })
    expect(Array.isArray(result)).toBe(true)
  })

  it('lookupService should return a promise', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.lookupService('127.0.0.1', 80)
    expect(result).toHaveProperty('hostname')
    expect(result).toHaveProperty('service')
  })

  it('resolve should return empty array', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.resolve('example.com')
    expect(result).toEqual([])
  })

  it('resolve4 should return empty array', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.resolve4('example.com')
    expect(result).toEqual([])
  })

  it('resolve6 should return empty array', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.resolve6('example.com')
    expect(result).toEqual([])
  })

  it('reverse should return empty array', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const result = await promises.reverse('127.0.0.1')
    expect(result).toEqual([])
  })

  it('getServers should return empty array', () => {
    // @ts-expect-error -- ignore
    expect(promises.getServers()).toEqual([])
  })

  it('Resolver should be constructable', () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const resolver = new promises.Resolver()
    expect(resolver).toBeDefined()
  })

  it('Resolver.resolve should return a promise', async () => {
    // @ts-expect-error -- ignore
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- ignore for testing
    const resolver = new promises.Resolver()
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access -- ignore for testing
    const result = await resolver.resolve('example.com')
    expect(result).toEqual([])
  })
})
