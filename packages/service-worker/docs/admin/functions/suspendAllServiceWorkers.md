[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / suspendAllServiceWorkers

# Function: suspendAllServiceWorkers()

```ts
function suspendAllServiceWorkers(options?): Promise<Map<string, SvcWorkerSessionCircuitBreakerResult>>;
```

Suspend all registered service workers (soft kill / circuit breaker).

This engages the circuit breaker on all service workers, disabling
their functionality without unregistering them.

## Parameters

| Parameter  | Type                                                | Description     |
| ---------- | --------------------------------------------------- | --------------- |
| `options?` | [`SuspendOptions`](../interfaces/SuspendOptions.md) | Suspend options |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionCircuitBreakerResult`](../../protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\>\>

Map of registry keys to suspend results

## Example

```ts
import { suspendAllServiceWorkers } from '@vrowser/service-worker/admin'

// Suspend all service workers (e.g., for maintenance)
const results = await suspendAllServiceWorkers()
for (const [key, result] of results) {
  console.log(`${key}: suspended=${result.mode === 'suspend'}`)
}
```
