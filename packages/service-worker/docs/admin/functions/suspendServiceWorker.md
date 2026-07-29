# Function: suspendServiceWorker()

Suspend a specific service worker (soft kill / circuit breaker).

This engages the circuit breaker, disabling service worker functionality
without unregistering it.

## Signature

```ts
export async function suspendServiceWorker(scriptURL: URL, version: string, options?: SuspendOptions): Promise<SvcWorkerSessionCircuitBreakerResult>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |
| `options` | [`SuspendOptions`](/packages/service-worker/docs/admin/interfaces/SuspendOptions.md) | Suspend options _(optional)_ |

## Returns

`Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\> — Result of the suspend operation

## Throws

- Error if controller is not found

## Examples

```ts
import { suspendServiceWorker } from '@vrowzer/service-worker/admin'

// Suspend a specific service worker
const result = await suspendServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0')
console.log(`Suspended: ${result.mode === 'suspend'}`)
```
