[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerController

# Interface: SvcWorkerController

Service worker controller

## Extends

- `Emittable`\<[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\>.`Disposable`

## Methods

### emit()

```ts
emit<Key>(event, ...payload): void;
```

Invoke all handlers with the event type.

Note Manually firing "\*" handlers should be not supported

#### Type Parameters

| Type Parameter                                                                                        |
| ----------------------------------------------------------------------------------------------------- |
| `Key` _extends_ keyof [`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md) |

#### Parameters

| Parameter    | Type                                                                                                                                                                                                                 | Description                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `event`      | `Key`                                                                                                                                                                                                                | An EventType                                                |
| ...`payload` | [`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\[`Key`\] _extends_ `undefined` ? \[\] : \[[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\[`Key`\]\] | An event payload, optional if the event type is `undefined` |

#### Returns

`void`

#### Inherited from

```ts
Emittable.emit
```

---

### off()

#### Call Signature

```ts
off(event, handler): void;
```

Unregister a wildcard event handler

##### Parameters

| Parameter | Type                                                                                                      | Description                  |
| --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `event`   | `"*"`                                                                                                     | The wildcard event type "\*" |
| `handler` | `WildcardEventHandler`\<[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\> | A WildcardEventHandler       |

##### Returns

`void`

##### Inherited from

```ts
Emittable.off
```

#### Call Signature

```ts
off<Key>(event, handler): void;
```

Unregister an event handler for the event type

##### Type Parameters

| Type Parameter                                                                                        |
| ----------------------------------------------------------------------------------------------------- |
| `Key` _extends_ keyof [`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md) |

##### Parameters

| Parameter | Type                                                                                                       | Description     |
| --------- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| `event`   | `Key`                                                                                                      | An EventType    |
| `handler` | `EventHandler`\<[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\[`Key`\]\> | An EventHandler |

##### Returns

`void`

##### Inherited from

```ts
Emittable.off
```

---

### on()

#### Call Signature

```ts
on(event, handler): EventStopHandler;
```

Register a wildcard event handler that receives all events

##### Parameters

| Parameter | Type                                                                                                      | Description                  |
| --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `event`   | `"*"`                                                                                                     | The wildcard event type "\*" |
| `handler` | `WildcardEventHandler`\<[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\> | A WildcardEventHandler       |

##### Returns

`EventStopHandler`

An EventStopHandler

##### Inherited from

```ts
Emittable.on
```

#### Call Signature

```ts
on<Key>(event, handler): EventStopHandler;
```

Register an event handler with the event type

##### Type Parameters

| Type Parameter                                                                                        |
| ----------------------------------------------------------------------------------------------------- |
| `Key` _extends_ keyof [`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md) |

##### Parameters

| Parameter | Type                                                                                                       | Description     |
| --------- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| `event`   | `Key`                                                                                                      | An EventType    |
| `handler` | `EventHandler`\<[`SvcWorkerControllerEventMap`](../type-aliases/SvcWorkerControllerEventMap.md)\[`Key`\]\> | An EventHandler |

##### Returns

`EventStopHandler`

An EventStopHandler

##### Inherited from

```ts
Emittable.on
```

## Properties

| Property                                   | Modifier   | Type                                                                                                                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Overrides              |
| ------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| <a id="dispose"></a> `[dispose]`           | `public`   | () => `void`                                                                                                                              | Symbol.dispose for `using` syntax support (TypeScript 5.2+)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Disposable.[dispose]` |
| <a id="dispose-1"></a> `dispose`           | `public`   | () => `void`                                                                                                                              | Dispose the controller instance and remove from cache. After disposal, a new instance can be created with the same options.                                                                                                                                                                                                                                                                                                                                                                                                 | -                      |
| <a id="ready"></a> `ready`                 | `public`   | (`options?`) => `Promise`\<`boolean`\>                                                                                                    | Ready for the expected service worker to become active. Calling this method internally checks the service worker's state using the API provided by `navigator.serviceWorker`. Based on that state, it triggers events like `reloadSuggested` or `changeState` and internally initializes until the expected service worker version becomes active. After initialization completes, the application logic can be controlled via the [state](#state) and createSvcWorkerController.serviceWorker \| serviceWorker properties. | -                      |
| <a id="resume"></a> `resume`               | `public`   | (`options?`) => `Promise`\<[`SvcWorkerSessionResumeResult`](../../protocols/interfaces/SvcWorkerSessionResumeResult.md)\>                 | Resume the service worker after suspension. This disengages the circuit breaker, restoring normal service worker functionality.                                                                                                                                                                                                                                                                                                                                                                                             | -                      |
| <a id="scripturl"></a> `scriptURL`         | `readonly` | `string`                                                                                                                                  | The script URL of the service worker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | -                      |
| <a id="serviceworker"></a> `serviceWorker` | `readonly` | `ServiceWorker` \| `null`                                                                                                                 | The ServiceWorker \| service worker instance that is managed by service worker controller                                                                                                                                                                                                                                                                                                                                                                                                                                   | -                      |
| <a id="state"></a> `state`                 | `readonly` | [`SvcWorkerControllerState`](../type-aliases/SvcWorkerControllerState.md)                                                                 | The current state of the SvcWorkerController                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -                      |
| <a id="suspend"></a> `suspend`             | `public`   | (`options?`) => `Promise`\<[`SvcWorkerSessionCircuitBreakerResult`](../../protocols/interfaces/SvcWorkerSessionCircuitBreakerResult.md)\> | Suspend the service worker (soft kill / circuit breaker). This engages the circuit breaker, disabling service worker functionality without unregistering it. The service worker remains active but should bypass its fetch handlers.                                                                                                                                                                                                                                                                                        | -                      |
| <a id="version"></a> `version`             | `readonly` | `string`                                                                                                                                  | The version tag of the service worker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | -                      |
