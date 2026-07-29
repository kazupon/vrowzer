# Interface: VirtualFSWatcher

chokidar compatible FSWatcher interface for virtual filesystems.

This interface is the base type that vite-dev-server's `FSWatcher` extends.
The `notify()` method is specific to VirtualFSWatcher.

## Signature

```ts
export interface VirtualFSWatcher
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`VirtualWatchOptions`](/packages/fs/docs/watcher/interfaces/VirtualWatchOptions.md) |  |

## Methods

### add()

```ts
add(paths: string | ReadonlyArray<string>): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `paths` | `string \| ReadonlyArray<string>` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### addListener()

```ts
addListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### close()

```ts
close(): Promise<void>;
```

#### Returns

`Promise<void>`

***

### emit()

```ts
emit(event: string, ...args: any[]): boolean;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `args` | `any[]` |  |

#### Returns

`boolean`

***

### eventNames()

```ts
eventNames(): string[];
```

#### Returns

`string[]`

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
getWatched(): { [directory: string]: string[] };
```

#### Returns

`object`

##### Indexable

```ts
[directory: string]: string[]
```

***

### listenerCount()

```ts
listenerCount(event: string): number;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |

#### Returns

`number`

***

### listeners()

```ts
listeners(event: string): Function[];
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |

#### Returns

`Function[]`

***

### notify()

```ts
notify(event: WatchEventName, path: string): void;
```

Notify the watcher of a file event.
Called by FileSystemSubscriber when a V_FS_* message is received.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | [`WatchEventName`](/packages/fs/docs/watcher/type-aliases/WatchEventName.md) |  |
| `path` | `string` |  |

#### Returns

`void`

***

### off()

```ts
off(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'add' | 'addDir' | 'change', listener: (path: string, stats?: any) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"add" \| "addDir" \| "change"` |  |
| `listener` | `(path: string, stats?: any) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'all', listener: (eventName: WatchEventName, path: string, stats?: any) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"all"` |  |
| `listener` | (`eventName`: [`WatchEventName`](/packages/fs/docs/watcher/type-aliases/WatchEventName.md), `path`: `string`, `stats`?: `any`) =\> `void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'error', listener: (error: Error) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"error"` |  |
| `listener` | `(error: Error) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'raw', listener: (eventName: string, path: string, details: any) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"raw"` |  |
| `listener` | `(eventName: string, path: string, details: any) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'ready', listener: () => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"ready"` |  |
| `listener` | `() => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: 'unlink' | 'unlinkDir', listener: (path: string) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `"unlink" \| "unlinkDir"` |  |
| `listener` | `(path: string) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### on()

```ts
on(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### once()

```ts
once(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### prependListener()

```ts
prependListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### prependOnceListener()

```ts
prependOnceListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### rawListeners()

```ts
rawListeners(event: string): Function[];
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |

#### Returns

`Function[]`

***

### ref()

```ts
ref(): VirtualFSWatcher;
```

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### removeAllListeners()

```ts
removeAllListeners(event?: string): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` | _optional_ |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### removeListener()

```ts
removeListener(event: string, listener: (...args: any[]) => void): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `event` | `string` |  |
| `listener` | `(...args: any[]) => void` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### setMaxListeners()

```ts
setMaxListeners(n: number): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `n` | `number` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### unref()

```ts
unref(): VirtualFSWatcher;
```

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)

***

### unwatch()

```ts
unwatch(paths: string | ReadonlyArray<string>): VirtualFSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `paths` | `string \| ReadonlyArray<string>` |  |

#### Returns

[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)
