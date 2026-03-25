[**@vrowzer/service-worker**](../../index.md)

***

[@vrowzer/service-worker](../../index.md) / [admin](../index.md) / resumeServiceWorker

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

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |
| `signal?` | `AbortSignal` | Optional abort signal to cancel the operation |

## Returns

`Promise`\<[`SvcWorkerSessionResumeResult`](../../protocols/interfaces/SvcWorkerSessionResumeResult.md)\>

Result of the resume operation

## Throws

Error if controller is not found

## Example

```ts
import { resumeServiceWorker } from '@vrowzer/service-worker/admin'

// Resume a specific service worker
const result = await resumeServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0')
console.log('Resumed successfully')
```
