[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [watcher](../index.md) / VirtualFSWatcher

# Interface: VirtualFSWatcher

chokidar compatible FSWatcher interface for virtual filesystems.

This interface is the base type that vite-dev-server's `FSWatcher` extends.
The `notify()` method is specific to VirtualFSWatcher.

## Methods

### add()

```ts
add(paths): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `paths` | `string` \| readonly `string`[] |

#### Returns

`VirtualFSWatcher`

***

### addListener()

```ts
addListener(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### close()

```ts
close(): Promise<void>;
```

#### Returns

`Promise`\<`void`\>

***

### emit()

```ts
emit(event, ...args): boolean;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| ...`args` | `any`[] |

#### Returns

`boolean`

***

### eventNames()

```ts
eventNames(): string[];
```

#### Returns

`string`[]

***

### getMaxListeners()

```ts
getMaxListeners(): number;
```

#### Returns

`number`

***

### getWatched()

```ts
getWatched(): object;
```

#### Returns

`object`

***

### listenerCount()

```ts
listenerCount(event): number;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |

#### Returns

`number`

***

### listeners()

```ts
listeners(event): Function[];
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |

#### Returns

`Function`[]

***

### notify()

```ts
notify(event, path): void;
```

Notify the watcher of a file event.
Called by FileSystemSubscriber when a V_FS_* message is received.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`WatchEventName`](../type-aliases/WatchEventName.md) |
| `path` | `string` |

#### Returns

`void`

***

### off()

```ts
off(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### on()

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"change"` \| `"add"` \| `"addDir"` |
| `listener` | (`path`, `stats?`) => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"all"` |
| `listener` | (`eventName`, `path`, `stats?`) => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"error"` |
| `listener` | (`error`) => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"raw"` |
| `listener` | (`eventName`, `path`, `details`) => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"ready"` |
| `listener` | () => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `"unlink"` \| `"unlinkDir"` |
| `listener` | (`path`) => `void` |

##### Returns

`VirtualFSWatcher`

#### Call Signature

```ts
on(event, listener): VirtualFSWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

##### Returns

`VirtualFSWatcher`

***

### once()

```ts
once(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### prependListener()

```ts
prependListener(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### prependOnceListener()

```ts
prependOnceListener(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### rawListeners()

```ts
rawListeners(event): Function[];
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |

#### Returns

`Function`[]

***

### ref()

```ts
ref(): VirtualFSWatcher;
```

#### Returns

`VirtualFSWatcher`

***

### removeAllListeners()

```ts
removeAllListeners(event?): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event?` | `string` |

#### Returns

`VirtualFSWatcher`

***

### removeListener()

```ts
removeListener(event, listener): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `listener` | (...`args`) => `void` |

#### Returns

`VirtualFSWatcher`

***

### setMaxListeners()

```ts
setMaxListeners(n): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `n` | `number` |

#### Returns

`VirtualFSWatcher`

***

### unref()

```ts
unref(): VirtualFSWatcher;
```

#### Returns

`VirtualFSWatcher`

***

### unwatch()

```ts
unwatch(paths): VirtualFSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `paths` | `string` \| readonly `string`[] |

#### Returns

`VirtualFSWatcher`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-options"></a> `options` | [`VirtualWatchOptions`](VirtualWatchOptions.md) |
