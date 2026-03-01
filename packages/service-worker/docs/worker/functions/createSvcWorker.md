[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [worker](../index.md) / createSvcWorker

# Function: createSvcWorker()

```ts
function createSvcWorker(self, options): SvcWorker;
```

Create a Service Worker wrapper with Proxy-based transparent access

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `self` | `ServiceWorkerGlobalScope` | The ServiceWorkerGlobalScope instance (typically `self` in a service worker) |
| `options` | [`SvcWorkerOptions`](../interfaces/SvcWorkerOptions.md) | Configuration options including version |

## Returns

[`SvcWorker`](../interfaces/SvcWorker.md)

A [SvcWorker](../interfaces/SvcWorker.md) instance that wraps the native service worker

## Example

```ts
import { createSvcWorker } from '@vrowser/service-worker/worker'

const sw = createSvcWorker(self, { version: '1.0.0' })

sw.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
```
