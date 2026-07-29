# Interface: SvcWorker

Service Worker interface that extends ServiceWorkerGlobalScope

This interface provides transparent access to all native Service Worker APIs
while adding version management capabilities.

## Extends

- `ServiceWorkerGlobalScope`
- `Disposable`

## Signature

```ts
export interface SvcWorker extends ServiceWorkerGlobalScope, Disposable
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `sessionCount` _(readonly)_ | `number` | The number of active sessions |
| `suspended` _(readonly)_ | `boolean` | Whether the service worker is suspended (circuit breaker engaged). When `true`, fetch handlers should bypass their logic and return `fetch(event.request)` directly. |
| `version` _(readonly)_ | `string` | The version of this service worker |

## Methods

### dispose()

```ts
dispose(): void;
```

Dispose the service worker and clean up resources

#### Returns

`void`
