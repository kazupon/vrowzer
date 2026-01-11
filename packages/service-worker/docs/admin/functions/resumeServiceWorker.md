[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [admin](../index.md) / resumeServiceWorker

# Function: resumeServiceWorker()

```ts
function resumeServiceWorker(
   scriptURL,
   version,
signal?): Promise<SvcWorkerSessionResumeResult>;
```

Resume a specific suspended service worker.

This disengages the circuit breaker, restoring service worker functionality.

## Parameters

| Parameter   | Type              | Description                                   |
| ----------- | ----------------- | --------------------------------------------- |
| `scriptURL` | `string` \| `URL` | The service worker script URL                 |
| `version`   | `string`          | The service worker version                    |
| `signal?`   | `AbortSignal`     | Optional abort signal to cancel the operation |

## Returns

`Promise`\<[`SvcWorkerSessionResumeResult`](../../protocols/interfaces/SvcWorkerSessionResumeResult.md)\>

Result of the resume operation

## Throws

Error if controller is not found

## Example

```typescript
import { resumeServiceWorker } from '@vrowser/service-worker'

// Resume a specific service worker
const result = await resumeServiceWorker('/sw.js', 'v1.0.0')
console.log('Resumed successfully')
```
