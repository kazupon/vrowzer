# Function: terminateAllServiceWorkers()

Terminate all registered service workers (hard kill / circuit breaker trip).

This trips the circuit breaker on all service workers, causing them
to unregister themselves. This is a destructive operation.

## Signature

```ts
export async function terminateAllServiceWorkers(options?: TerminateOptions): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`TerminateOptions`](/packages/service-worker/docs/admin/interfaces/TerminateOptions.md) | Terminate options _(optional)_ |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>\> — Map of registry keys to terminate results

## Examples

```ts
import { terminateAllServiceWorkers } from '@vrowzer/service-worker/admin'

// Terminate all service workers (e.g., for emergency shutdown)
const results = await terminateAllServiceWorkers({ clearCaches: true })
for (const [key, result] of results) {
  console.log(`${key}: terminated=${result.terminated}`)
}
```
