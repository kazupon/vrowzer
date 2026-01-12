[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / resumeAllServiceWorkers

# Function: resumeAllServiceWorkers()

```ts
function resumeAllServiceWorkers(signal?): Promise<Map<string, SvcWorkerSessionResumeResult>>;
```

Resume all suspended service workers.

This disengages the circuit breaker on all suspended service workers,
restoring their functionality.

## Parameters

| Parameter | Type          | Description                                   |
| --------- | ------------- | --------------------------------------------- |
| `signal?` | `AbortSignal` | Optional abort signal to cancel the operation |

## Returns

`Promise`\<`Map`\<`string`, [`SvcWorkerSessionResumeResult`](../../protocols/interfaces/SvcWorkerSessionResumeResult.md)\>\>

Map of registry keys to resume results

## Example

```ts
import { resumeAllServiceWorkers } from '@vrowser/service-worker/admin'

// Resume all suspended service workers
const results = await resumeAllServiceWorkers()
for (const [key, result] of results) {
  console.log(`${key}: resumed`)
}
```
