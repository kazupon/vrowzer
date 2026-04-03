[**@vrowzer/safe-port**](../index.md)

***

[@vrowzer/safe-port](../index.md) / SafeMessagePort

# Interface: SafeMessagePort\<T\>

Safe MessagePort wrapper interface

## Extends

- `Emittable`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\>.`Disposable`

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | `unknown` | Message data type |

## Methods

### \[dispose\]()

```ts
dispose: void;
```

#### Returns

`void`

#### Inherited from

```ts
Disposable.[dispose]
```

***

### close()

```ts
close(): void;
```

#### Returns

`void`

***

### dispose()

```ts
dispose(): void;
```

Dispose the event emitter and all registered event handlers

#### Returns

`void`

#### Inherited from

```ts
Emittable.dispose
```

***

### emit()

```ts
emit<Key>(event, ...payload): void;
```

Invoke all handlers with the event type.

Note Manually firing "*" handlers should be not supported

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `Key` *extends* keyof [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\> | An event type key |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| ...`payload` | [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\] *extends* `undefined` ? \[\] : [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\] *extends* `unknown`[] ? `any`\[`any`\] : \[[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\]\] | An event payload, optional if the event type is `undefined` |

#### Returns

`void`

#### Inherited from

```ts
Emittable.emit
```

***

### off()

#### Call Signature

```ts
off(event, handler): void;
```

Unregister a wildcard event handler

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `"*"` | The wildcard event type "*" |
| `handler` | `WildcardEventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\> | A WildcardEventHandler |

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

| Type Parameter | Description |
| ------ | ------ |
| `Key` *extends* keyof [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\> | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\]\> | An EventHandler |

##### Returns

`void`

##### Inherited from

```ts
Emittable.off
```

***

### on()

#### Call Signature

```ts
on(event, handler): EventStopHandler;
```

Register a wildcard event handler that receives all events

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `"*"` | The wildcard event type "*" |
| `handler` | `WildcardEventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\> | A WildcardEventHandler |

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

| Type Parameter | Description |
| ------ | ------ |
| `Key` *extends* keyof [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\> | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\]\> | An EventHandler |

##### Returns

`EventStopHandler`

An EventStopHandler

##### Inherited from

```ts
Emittable.on
```

***

### once()

#### Call Signature

```ts
once(event, handler): () => void;
```

Register a one-time wildcard event handler that receives all events.
The handler will be automatically unregistered after the first invocation.

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `"*"` | The wildcard event type "*" |
| `handler` | `WildcardEventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\> | A WildcardEventHandler |

##### Returns

A function to manually stop the handler before it fires

() => `void`

##### Inherited from

```ts
Emittable.once
```

#### Call Signature

```ts
once<Key>(event, handler): () => void;
```

Register a one-time event handler with the event type.
The handler will be automatically unregistered after the first invocation.

##### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `Key` *extends* keyof [`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\> | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<[`MessagePortEvents`](../type-aliases/MessagePortEvents.md)\<`T`\>\[`Key`\]\> | An EventHandler |

##### Returns

A function to manually stop the handler before it fires

() => `void`

##### Inherited from

```ts
Emittable.once
```

***

### postMessage()

```ts
postMessage(message, transfer?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `any` |
| `transfer?` | `Transferable`[] |

#### Returns

`void`

***

### start()

```ts
start(): void;
```

#### Returns

`void`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-addeventlistener"></a> `addEventListener` | \{ \<`K`\> (`type`, `listener`, `options?`): `void`; (`type`, `listener`, `options?`): `void`; \} |
| <a id="property-dispatchevent"></a> `dispatchEvent` | \{ (`event`): `boolean`; (`event`): `boolean`; \} |
| <a id="property-onmessage"></a> `onmessage` | ((`this`, `ev`) => `any`) \| `null` |
| <a id="property-onmessageerror"></a> `onmessageerror` | ((`this`, `ev`) => `any`) \| `null` |
| <a id="property-raw"></a> `raw` | `MessagePort` |
| <a id="property-removeeventlistener"></a> `removeEventListener` | \{ \<`K`\> (`type`, `listener`, `options?`): `void`; (`type`, `listener`, `options?`): `void`; \} |
