[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / suspendServiceWorker

# Function: suspendServiceWorker()

```ts
function suspendServiceWorker(
   scriptURL,
   version,
options?): Promise<SvcWorkerSessionCircuitBreakerResult>;
```

Suspend a specific service worker (soft kill / circuit breaker).

This engages the circuit breaker, disabling service worker functionality
without unregistering it.

## Parameters

| Parameter   | Type                                                | Description                   |
| ----------- | --------------------------------------------------- | ----------------------------- |
| `scriptURL` | `string` \| `URL`                                   | The service worker script URL |
| `version`   | `string`                                            | The service worker version    |
| `options?`  | [`SuspendOptions`](../interfaces/SuspendOptions.md) | Suspend options               |

## Returns

`Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](../../protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>

Result of the suspend operation

## Throws

Error if controller is not found

## Example

```ts
import { suspendServiceWorker } from '@vrowser/service-worker/admin'

// Suspend a specific service worker
const result = await suspendServiceWorker('/sw.js', 'v1.0.0')
console.log(`Suspended: ${result.mode === 'suspend'}`)
```
