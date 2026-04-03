[**vrowzer**](../index.md)

***

[vrowzer](../index.md) / Vrowzer

# Interface: Vrowzer

The main interface for the Vrowzer preview environment.

## Extends

- `Emittable`\<[`VrowzerEventMap`](../type-aliases/VrowzerEventMap.md)\>

## Methods

### addFile()

```ts
addFile(filePath, content): void;
```

Adds a new file to the preview environment with the specified content.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be added. |
| `content` | `string` \| `ArrayBuffer` | The content of the file, which can be a string or an ArrayBuffer. |

#### Returns

`void`

***

### deleteFile()

```ts
deleteFile(filePath): void;
```

Deletes a specific file from the preview environment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be deleted. |

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
| `Key` *extends* keyof `SvcWorkerControllerEventMap` | An event type key |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| ...`payload` | `SvcWorkerControllerEventMap`\[`Key`\] *extends* `undefined` ? \[\] : `SvcWorkerControllerEventMap`\[`Key`\] *extends* `unknown`[] ? `any`\[`any`\] : \[`SvcWorkerControllerEventMap`\[`Key`\]\] | An event payload, optional if the event type is `undefined` |

#### Returns

`void`

#### Inherited from

```ts
Emittable.emit
```

***

### mount()

```ts
mount(container): void;
```

Mounts the preview system to a specified container element in the DOM.

Creates a credentialless iframe with srcdoc bootstrap that fetches
the preview HTML via the Service Worker.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `container` | `HTMLElement` | A DOM element where the preview iframe will be mounted. |

#### Returns

`void`

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
| `handler` | `WildcardEventHandler`\<`SvcWorkerControllerEventMap`\> | A WildcardEventHandler |

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
| `Key` *extends* keyof `SvcWorkerControllerEventMap` | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<`SvcWorkerControllerEventMap`\[`Key`\]\> | An EventHandler |

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
| `handler` | `WildcardEventHandler`\<`SvcWorkerControllerEventMap`\> | A WildcardEventHandler |

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
| `Key` *extends* keyof `SvcWorkerControllerEventMap` | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<`SvcWorkerControllerEventMap`\[`Key`\]\> | An EventHandler |

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
| `handler` | `WildcardEventHandler`\<`SvcWorkerControllerEventMap`\> | A WildcardEventHandler |

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
| `Key` *extends* keyof `SvcWorkerControllerEventMap` | An event type key |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `Key` | An EventType |
| `handler` | `EventHandler`\<`SvcWorkerControllerEventMap`\[`Key`\]\> | An EventHandler |

##### Returns

A function to manually stop the handler before it fires

() => `void`

##### Inherited from

```ts
Emittable.once
```

***

### ready()

```ts
ready(config): Promise<boolean>;
```

Ready for preview system initialization.

This method initializes the Web Worker, Service Worker, and MessageChannel,
then syncs initial files to both workers.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`VrowzerConfig`](VrowzerConfig.md) |

#### Returns

`Promise`\<`boolean`\>

A promise that resolves to `true` if the boot process is successful, or `false` if it fails.

***

### reloadPreview()

```ts
reloadPreview(): void;
```

Reloads the preview iframe

#### Returns

`void`

***

### updateFile()

```ts
updateFile(filePath, content): void;
```

Updates the content of a specific file in the preview environment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be updated. |
| `content` | `string` \| `ArrayBuffer` | The new content for the file, which can be a string or an ArrayBuffer. |

#### Returns

`void`
