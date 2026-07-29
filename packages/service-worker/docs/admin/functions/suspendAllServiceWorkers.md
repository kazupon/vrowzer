# Function: suspendAllServiceWorkers()

Suspend all registered service workers (soft kill / circuit breaker).

This engages the circuit breaker on all service workers, disabling
their functionality without unregistering them.

## Signature

```ts
export async function suspendAllServiceWorkers(options?: SuspendOptions): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`SuspendOptions`](/packages/service-worker/docs/admin/interfaces/SuspendOptions.md) | Suspend options _(optional)_ |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>\> — Map of registry keys to suspend results

## Examples

```ts
import { suspendAllServiceWorkers } from '@vrowzer/service-worker/admin'

// Suspend all service workers (e.g., for maintenance)
const results = await suspendAllServiceWorkers()
for (const [key, result] of results) {
  console.log(`${key}: suspended=${result.mode === 'suspend'}`)
}
```
