import { createBirpc } from 'birpc'
import { describe, expect, it, vi } from 'vite-plus/test'
import {
  connectSafeModulePathSync,
  createServiceWorkerFunctions,
  deserializeRpcMessage,
  serializeRpcMessage,
} from './rpc'
import type { ServiceWorkerFunctions } from './rpc'

interface ErrorWithMetadata extends Error {
  code?: string
  id?: string
}

interface ThrowingFunctions {
  fail: () => never
}

describe('RPC message serialization', () => {
  it('preserves Error code and id across structured clone', () => {
    const error = new Error('Denied ID /project/.env?raw') as ErrorWithMetadata
    error.code = 'ERR_DENIED_ID'
    error.id = '/project/.env?raw'

    const serialized = serializeRpcMessage({
      t: 's',
      i: 'request-id',
      e: error,
    })
    const cloned = structuredClone(serialized)
    const deserialized = deserializeRpcMessage(cloned) as {
      e: ErrorWithMetadata
    }

    expect(deserialized.e).toBeInstanceOf(Error)
    expect(deserialized.e.name).toBe('Error')
    expect(deserialized.e.message).toBe('Denied ID /project/.env?raw')
    expect(deserialized.e.stack).toBe(error.stack)
    expect(deserialized.e.code).toBe('ERR_DENIED_ID')
    expect(deserialized.e.id).toBe('/project/.env?raw')
  })

  it('preserves Error metadata through a birpc MessageChannel', async () => {
    const channel = new MessageChannel()
    const client = createBirpc<
      ThrowingFunctions,
      Record<string, never>
    >({}, {
      post: data => channel.port1.postMessage(data),
      on: fn => {
        channel.port1.onmessage = event => fn(event.data)
      },
      serialize: serializeRpcMessage,
      deserialize: deserializeRpcMessage,
    })
    const server = createBirpc<
      Record<string, never>,
      ThrowingFunctions
    >({
      fail() {
        const error = new Error('Denied ID /project/.env?raw') as ErrorWithMetadata
        error.code = 'ERR_DENIED_ID'
        error.id = '/project/.env?raw'
        throw error
      },
    }, {
      post: data => channel.port2.postMessage(data),
      on: fn => {
        channel.port2.onmessage = event => fn(event.data)
      },
      serialize: serializeRpcMessage,
      deserialize: deserializeRpcMessage,
    })

    try {
      let received: unknown
      try {
        await client.fail()
      } catch (error) {
        received = error
      }

      expect(received).toBeInstanceOf(Error)
      expect(received).toMatchObject({
        message: 'Denied ID /project/.env?raw',
        code: 'ERR_DENIED_ID',
        id: '/project/.env?raw',
      })
    } finally {
      client.$close()
      server.$close()
      channel.port1.close()
      channel.port2.close()
    }
  })

  it('does not transform regular RPC payloads', () => {
    const message = {
      t: 's',
      i: 'request-id',
      r: { code: 'export default "safe"' },
    }

    expect(serializeRpcMessage(message)).toBe(message)
    expect(deserializeRpcMessage(message)).toBe(message)
  })

  it('does not transform errors without string metadata', () => {
    const message = {
      t: 's',
      i: 'request-id',
      e: new Error('Transform failed'),
    }

    expect(serializeRpcMessage(message)).toBe(message)
  })
})

describe('safe module path RPC', () => {
  it('registers paths across a birpc MessageChannel', async () => {
    const channel = new MessageChannel()
    const safeModulePaths = new Set<string>(['/existing.ts'])
    const client = createBirpc<
      ServiceWorkerFunctions,
      Record<string, never>
    >({}, {
      post: data => channel.port1.postMessage(data),
      on: fn => {
        channel.port1.onmessage = event => fn(event.data)
      },
    })
    const server = createBirpc<
      Record<string, never>,
      ServiceWorkerFunctions
    >(createServiceWorkerFunctions(safeModulePaths), {
      post: data => channel.port2.postMessage(data),
      on: fn => {
        channel.port2.onmessage = event => fn(event.data)
      },
    })

    try {
      await client.registerSafeModulePaths([
        '/outside/entry.ts',
        '/existing.ts',
      ])
      await client.registerSafeModulePaths(['/outside/ssr.ts'])

      expect(safeModulePaths).toEqual(
        new Set([
          '/existing.ts',
          '/outside/entry.ts',
          '/outside/ssr.ts',
        ]),
      )
    } finally {
      client.$close()
      server.$close()
      channel.port1.close()
      channel.port2.close()
    }
  })

  it('snapshots paths and replaces environment callbacks on reconnect', async () => {
    const environments = [
      { _syncSafeModulePaths: undefined },
      { _syncSafeModulePaths: undefined },
    ]
    const safeModulePaths = new Set(['/existing.ts'])
    const firstRegister = vi.fn<(paths: string[]) => Promise<void>>(
      async () => undefined,
    )

    await connectSafeModulePathSync(
      environments,
      safeModulePaths,
      firstRegister,
    )
    expect(firstRegister).toHaveBeenCalledWith(['/existing.ts'])

    safeModulePaths.add('/later.ts')
    await environments[0]._syncSafeModulePaths?.(['/later.ts'])
    expect(firstRegister).toHaveBeenLastCalledWith(['/later.ts'])

    const secondRegister = vi.fn<(paths: string[]) => Promise<void>>(
      async () => undefined,
    )
    await connectSafeModulePathSync(
      environments,
      safeModulePaths,
      secondRegister,
    )
    expect(secondRegister).toHaveBeenCalledWith([
      '/existing.ts',
      '/later.ts',
    ])

    await environments[1]._syncSafeModulePaths?.(['/reconnected.ts'])
    expect(secondRegister).toHaveBeenLastCalledWith(['/reconnected.ts'])
    expect(firstRegister).toHaveBeenCalledTimes(2)
  })
})
