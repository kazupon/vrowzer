# Function: createVirtualFSWatcher()

Create a VirtualFSWatcher instance.

## Signature

```ts
export function createVirtualFSWatcher(options: VirtualWatchOptions = {}): Readonly<VirtualFSWatcher>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`VirtualWatchOptions`](/packages/fs/docs/watcher/interfaces/VirtualWatchOptions.md) | Watch options (structural compatibility with chokidar WatchOptions) _(optional, default: {})_ |

## Returns

`Readonly`\<[`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md)\> — VirtualFSWatcher instance
