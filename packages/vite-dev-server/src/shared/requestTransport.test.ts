import { createBirpc } from 'birpc'
import { describe, expect, it } from 'vite-plus/test'
import {
  deserializeRequest,
  getRpcTransferList,
  serializeRequest,
  serializeResponse,
} from './requestTransport'
import type { SerializedRequest, SerializedResponse, WorkerFunctions } from './rpc'

function bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

function text(buffer: ArrayBuffer | null): string | null {
  return buffer === null ? null : new TextDecoder().decode(buffer)
}

describe('request serialization', () => {
  it('keeps the method, URL and headers of a request without a body', async () => {
    const request = new Request('https://example.com/__preview__/src/main.ts?t=1', {
      headers: { accept: 'text/javascript', 'x-custom': 'yes' },
    })

    const serialized = await serializeRequest(request)

    expect(serialized).toEqual({
      url: 'https://example.com/__preview__/src/main.ts?t=1',
      method: 'GET',
      headers: [['accept', 'text/javascript'], ['x-custom', 'yes']],
      body: null,
    })
  })

  it('has no body for a HEAD request', async () => {
    const serialized = await serializeRequest(
      new Request('https://example.com/__preview__/', { method: 'HEAD' }),
    )

    expect(serialized.method).toBe('HEAD')
    expect(serialized.body).toBeNull()
  })

  it('reads the body of other requests', async () => {
    const serialized = await serializeRequest(
      new Request('https://example.com/__preview__/api', { method: 'POST', body: 'payload' }),
    )

    expect(serialized.method).toBe('POST')
    expect(serialized.body).toBeInstanceOf(ArrayBuffer)
    expect(text(serialized.body)).toBe('payload')
  })

  it('restores a request', async () => {
    const request = deserializeRequest({
      url: 'https://example.com/__preview__/api?x=1',
      method: 'PUT',
      headers: [['content-type', 'text/plain'], ['accept', '*/*']],
      body: bytes('updated'),
    })

    expect(request.url).toBe('https://example.com/__preview__/api?x=1')
    expect(request.method).toBe('PUT')
    expect(request.headers.get('content-type')).toBe('text/plain')
    expect(request.headers.get('accept')).toBe('*/*')
    expect(await request.text()).toBe('updated')
  })

  it('restores a request without a body', () => {
    const request = deserializeRequest({
      url: 'https://example.com/__preview__/',
      method: 'GET',
      headers: [],
      body: null,
    })

    expect(request.method).toBe('GET')
    expect(request.body).toBeNull()
  })
})

describe('response serialization', () => {
  it('keeps the status, headers and body of a response', async () => {
    const response = new Response('export default 1', {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'text/javascript', etag: 'W/"1"' },
    })

    const serialized = await serializeResponse(response)

    expect(serialized).toMatchObject({
      status: 201,
      statusText: 'Created',
      headers: expect.arrayContaining([
        ['content-type', 'text/javascript'],
        ['etag', 'W/"1"'],
      ]),
    })
    expect(text(serialized.body)).toBe('export default 1')
  })

  it('has no body for a response without one', async () => {
    const serialized = await serializeResponse(new Response(null, { status: 304 }))

    expect(serialized.status).toBe(304)
    expect(serialized.body).toBeNull()
  })

  it('keeps binary bodies', async () => {
    const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])

    const serialized = await serializeResponse(new Response(binary))

    expect([...new Uint8Array(serialized.body!)]).toEqual([...binary])
  })
})

describe('RPC transfer list', () => {
  const request: SerializedRequest = {
    url: 'https://example.com/__preview__/api',
    method: 'POST',
    headers: [],
    body: bytes('payload'),
  }
  const response: SerializedResponse = {
    status: 200,
    statusText: 'OK',
    headers: [],
    body: bytes('answer'),
  }

  it('lists the request body of a handleRequest call', () => {
    expect(getRpcTransferList({ t: 'q', i: 'id', m: 'handleRequest', a: [request] }))
      .toEqual([request.body])
  })

  it('lists nothing for a handleRequest call without a body', () => {
    expect(getRpcTransferList({ t: 'q', i: 'id', m: 'handleRequest', a: [{ ...request, body: null }] }))
      .toEqual([])
  })

  it('lists the body of a result', () => {
    expect(getRpcTransferList({ t: 's', i: 'id', r: response })).toEqual([response.body])
  })

  it('lists nothing for other messages', () => {
    expect(getRpcTransferList({ t: 'q', i: 'id', m: 'transformRequest', a: ['/src/main.ts'] }))
      .toEqual([])
    expect(getRpcTransferList({ t: 's', i: 'id', r: { code: 'export default 1', etag: 'W/"1"' } }))
      .toEqual([])
    expect(getRpcTransferList({ t: 's', i: 'id', r: null })).toEqual([])
    expect(getRpcTransferList({ t: 's', i: 'id', e: new Error('failed') })).toEqual([])
    expect(getRpcTransferList({ type: 'V_WW_SW_CHANNEL_READY', source: 'ww' })).toEqual([])
    expect(getRpcTransferList(null)).toEqual([])
  })

  it('transfers the bodies of handleRequest through a birpc MessageChannel', async () => {
    const channel = new MessageChannel()
    const sentResponses: SerializedResponse[] = []
    const client = createBirpc<WorkerFunctions, Record<string, never>>({}, {
      post: data => channel.port1.postMessage(data, getRpcTransferList(data)),
      on: fn => {
        channel.port1.onmessage = event => fn(event.data)
      },
    })
    const server = createBirpc<Record<string, never>, Pick<WorkerFunctions, 'handleRequest'>>({
      async handleRequest(received) {
        const answer: SerializedResponse = {
          status: 200,
          statusText: 'OK',
          headers: [['content-type', 'text/plain']],
          body: bytes(`echo: ${text(received.body)}`),
        }
        sentResponses.push(answer)
        return answer
      },
    }, {
      post: data => channel.port2.postMessage(data, getRpcTransferList(data)),
      on: fn => {
        channel.port2.onmessage = event => fn(event.data)
      },
    })

    try {
      const sentRequest: SerializedRequest = { ...request, body: bytes('payload') }
      const received = await client.handleRequest(sentRequest)

      expect(text(received.body)).toBe('echo: payload')
      // A transferred ArrayBuffer is detached in the sender
      expect(sentRequest.body!.byteLength).toBe(0)
      expect(sentResponses[0]!.body!.byteLength).toBe(0)
    } finally {
      client.$close()
      server.$close()
      channel.port1.close()
      channel.port2.close()
    }
  })
})
