# Function: resumeServiceWorker()

Resume a specific suspended service worker.

This disengages the circuit breaker, restoring service worker functionality.

## Signature

```ts
export async function resumeServiceWorker(scriptURL: URL, version: string, signal?: AbortSignal): Promise<SvcWorkerSessionResumeResult>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `scriptURL` | `URL` | The service worker script URL (must be a URL object) |
| `version` | `string` | The service worker version |
| `signal` | `AbortSignal` | Optional abort signal to cancel the operation _(optional)_ |

## Returns

`Promise`\<[`SvcWorkerSessionResumeResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeResult.md)\> — Result of the resume operation

## Throws

- Error if controller is not found

## Examples

```ts
import { resumeServiceWorker } from '@vrowzer/service-worker/admin'

// Resume a specific service worker
const result = await resumeServiceWorker(new URL('./sw.js', import.meta.url), 'v1.0.0')
console.log('Resumed successfully')
```
