# Interface: SvcWorkerController

Service worker controller.

## Extends

- `Emittable`\<[`SvcWorkerControllerEventMap`](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerEventMap.md)\>
- `Disposable`

## Signature

```ts
export interface SvcWorkerController extends Emittable<SvcWorkerControllerEventMap>, Disposable
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `container` _(readonly)_ | `ServiceWorkerContainer` | The service worker container used by this controller. |
| `dispose` | `() => void` | Dispose the controller instance and remove from cache. After disposal, a new instance can be created with the same options. |
| `ready` | (`options`?: [`SvcWorkerControllerReadyOptions`](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerReadyOptions.md)) =\> `Promise`\<`boolean`\> | Ready for the expected service worker to become active. Calling this method internally checks the service worker's state using the API provided by `navigator.serviceWorker`. Based on that state, it triggers events like `reloadSuggested` or `changeState` and internally initializes until the expected service worker version becomes active. After initialization completes, the application logic can be controlled via the [state](#property-state) and serviceWorker properties. |
| `resume` | (`options`?: { `signal`?: `AbortSignal` }) =\> `Promise`\<[`SvcWorkerSessionResumeResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeResult.md)\> | Resume the service worker after suspension. This disengages the circuit breaker, restoring normal service worker functionality. |
| `scriptURL` _(readonly)_ | `string` | The script URL of the service worker. |
| `serviceWorker` _(readonly)_ | `ServiceWorker \| null` | The service worker instance that is managed by service worker controller. |
| `state` _(readonly)_ | [`SvcWorkerControllerState`](/packages/service-worker/docs/controller/type-aliases/SvcWorkerControllerState.md) | The current state of the [SvcWorkerController](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md). |
| `suspend` | (`options`?: { `clearCaches`?: `boolean`; `signal`?: `AbortSignal` }) =\> `Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\> | Suspend the service worker (soft kill / circuit breaker). This engages the circuit breaker, disabling service worker functionality without unregistering it. The service worker remains active but should bypass its fetch handlers. |
| `version` _(readonly)_ | `string` | The version tag of the service worker. |

### dispose Returns

`void`

### ready Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`SvcWorkerControllerReadyOptions`](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerReadyOptions.md) | _optional_ |

### ready Returns

`Promise<boolean>` — If the expected service worker will be already active, this promise resolves immediately as `true`. - If the expected service worker will not be achieved to activate, this promise resolves as `false`.

### resume Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | `{ signal?: AbortSignal }` | Resume options _(optional)_ |
| `options.signal?` | `AbortSignal` | _optional_ |

### resume Returns

`Promise`\<[`SvcWorkerSessionResumeResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionResumeResult.md)\> — Result of the resume operation

### suspend Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | `{ clearCaches?: boolean; signal?: AbortSignal }` | Suspend options _(optional)_ |
| `options.clearCaches?` | `boolean` | _optional_ |
| `options.signal?` | `AbortSignal` | _optional_ |

### suspend Returns

`Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\> — Result of the suspend operation
