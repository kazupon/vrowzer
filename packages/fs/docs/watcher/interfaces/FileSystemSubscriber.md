# Interface: FileSystemSubscriber

Subscriber for processing filesystem sync messages in Workers.

## Signature

```ts
export interface FileSystemSubscriber
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `watcher` _(readonly)_ | [`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md) | chokidar compatible [FSWatcher](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md). |

## Methods

### handleMessage()

```ts
handleMessage(message: FileSystemSyncMessage): void;
```

Process a V_FS_* protocol message. Updates vol and notifies watcher.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | [`FileSystemSyncMessage`](/packages/fs/docs/watcher/type-aliases/FileSystemSyncMessage.md) |  |

#### Returns

`void`
