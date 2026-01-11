[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / terminateServiceWorker

# Function: terminateServiceWorker()

```ts
function terminateServiceWorker(
   scriptURL,
   version,
options?): Promise<SvcWorkerSessionCircuitBreakerResult>;
```

Terminate a specific service worker (hard kill / circuit breaker trip).

This trips the circuit breaker, causing the service worker to unregister
itself. This is a destructive operation.

## Parameters

| Parameter   | Type                                                    | Description                   |
| ----------- | ------------------------------------------------------- | ----------------------------- |
| `scriptURL` | `string` \| `URL`                                       | The service worker script URL |
| `version`   | `string`                                                | The service worker version    |
| `options?`  | [`TerminateOptions`](../interfaces/TerminateOptions.md) | Terminate options             |

## Returns

`Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](../../protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>

Result of the terminate operation

## Throws

Error if controller is not found or session is not established

## Example

```typescript
import { terminateServiceWorker } from '@vrowser/service-worker'

// Terminate a specific service worker
const result = await terminateServiceWorker('/sw.js', 'v1.0.0', { clearCaches: true })
console.log(`Terminated: ${result.terminated}`)
```
