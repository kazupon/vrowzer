# Function: resumeAllServiceWorkers()

Resume all suspended service workers.

This disengages the circuit breaker on all suspended service workers,
restoring their functionality.

## Signature

```ts
export async function resumeAllServiceWorkers(signal?: AbortSignal): Promise<Map<string, SvcWorkerSessionResumeResult>>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | Optional abort signal to cancel the operation _(optional)_ |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionResumeResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeResult.md)\>\> — Map of registry keys to resume results

## Examples

```ts
import { resumeAllServiceWorkers } from '@vrowzer/service-worker/admin'

// Resume all suspended service workers
const results = await resumeAllServiceWorkers()
for (const [key, result] of results) {
  console.log(`${key}: resumed`)
}
```
