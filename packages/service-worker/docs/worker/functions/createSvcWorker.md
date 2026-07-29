# Function: createSvcWorker()

Create a Service Worker wrapper with Proxy-based transparent access

## Signature

```ts
export function createSvcWorker(self: ServiceWorkerGlobalScope, options: SvcWorkerOptions): SvcWorker
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `self` | `ServiceWorkerGlobalScope` | The ServiceWorkerGlobalScope instance (typically `self` in a service worker) |
| `options` | [`SvcWorkerOptions`](/packages/service-worker/docs/worker/interfaces/SvcWorkerOptions.md) | Configuration options including version |

## Returns

[`SvcWorker`](/packages/service-worker/docs/worker/interfaces/SvcWorker.md) — A [SvcWorker](/packages/service-worker/docs/worker/interfaces/SvcWorker.md) instance that wraps the native service worker

## Examples

```ts
import { createSvcWorker } from '@vrowzer/service-worker/worker'

const sw = createSvcWorker(self, { version: '1.0.0' })

sw.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
```
