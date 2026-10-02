/**
 * Requests that the Service Worker forwards to the Web Worker
 *
 * The Service Worker forwards each request within the base path to the Web Worker, which answers
 * it with the Vite middlewares. Requests and responses cross the `MessagePort` between them as
 * plain data, and their bodies are transferred instead of copied.
 *
 * @module shared/requestTransport
 */

/**
 * @author kazuya kawaguchi (a.k.a. kazupon)
 * @license MIT
 */

import type { SerializedRequest, SerializedResponse } from './rpc'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Convert a request to the data that the Service Worker forwards. The body of a request other
 * than `GET` and `HEAD` is read.
 */
export async function serializeRequest(request: Request): Promise<SerializedRequest> {
  return {
    url: request.url,
    method: request.method,
    headers: [...request.headers],
    body: request.method === 'GET' || request.method === 'HEAD'
      ? null
      : await request.arrayBuffer(),
  }
}

/**
 * Restore a request that the Service Worker forwarded.
 */
export function deserializeRequest(request: SerializedRequest): Request {
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
}

/**
 * Convert a response to the data that the Web Worker answers with. The body is read.
 */
export async function serializeResponse(response: Response): Promise<SerializedResponse> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers],
    body: response.body === null ? null : await response.arrayBuffer(),
  }
}

function bodyOf(value: unknown): Transferable[] {
  return isRecord(value) && value.body instanceof ArrayBuffer ? [value.body] : []
}

/**
 * List the request and response bodies in a birpc message, for the transfer list of
 * `postMessage()`, so that they are moved instead of copied.
 *
 * A call of `handleRequest` carries the request in its arguments (`{ t: 'q', m, a }`), and the
 * result carries the response (`{ t: 's', r }`). No other RPC passes an `ArrayBuffer` body. A
 * transferred body cannot be read by the sender afterwards, and neither Worker reads it again.
 *
 * @param message - A birpc message, after `serializeRpcMessage()`
 */
export function getRpcTransferList(message: unknown): Transferable[] {
  if (!isRecord(message)) {
    return []
  }
  if (message.t === 'q' && message.m === 'handleRequest' && Array.isArray(message.a)) {
    return bodyOf(message.a[0])
  }
  if (message.t === 's') {
    return bodyOf(message.r)
  }
  return []
}
