[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [admin](../index.md) / terminateAllServiceWorkers

# Function: terminateAllServiceWorkers()

```ts
function terminateAllServiceWorkers(options?): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>>;
```

Terminate all registered service workers (hard kill / circuit breaker trip).

This trips the circuit breaker on all service workers, causing them
to unregister themselves. This is a destructive operation.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | [`TerminateOptions`](../interfaces/TerminateOptions.md) | Terminate options |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionCircuitBreakerResult`](../../protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>\>

Map of registry keys to terminate results

## Example

```ts
import { terminateAllServiceWorkers } from '@vrowzer/service-worker/admin'

// Terminate all service workers (e.g., for emergency shutdown)
const results = await terminateAllServiceWorkers({ clearCaches: true })
for (const [key, result] of results) {
  console.log(`${key}: terminated=${result.terminated}`)
}
```
