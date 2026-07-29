# Function: terminateServiceWorker()

Terminate a specific service worker (hard kill / circuit breaker trip).

This trips the circuit breaker, causing the service worker to unregister
itself. This is a destructive operation.

## Signature

```ts
export async function terminateServiceWorker(scriptURL: URL, version: string, options?: TerminateOptions): Promise<SvcWorkerSessionCircuitBreakerResult>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |
| `options` | [`TerminateOptions`](/packages/service-worker/docs/admin/interfaces/TerminateOptions.md) | Terminate options _(optional)_ |

## Returns

`Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\> — Result of the terminate operation

## Throws

- Error if controller is not found or session is not established

## Examples

```ts
import { terminateServiceWorker } from '@vrowzer/service-worker/admin'

// Terminate a specific service worker
const result = await terminateServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0', { clearCaches: true })
console.log(`Terminated: ${result.terminated}`)
```
