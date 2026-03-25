[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / FileSystemSubscriber

# Interface: FileSystemSubscriber

Subscriber for processing filesystem sync messages in Workers.

## Methods

### handleMessage()

```ts
handleMessage(message): void;
```

Process a V_FS_* protocol message. Updates vol and notifies watcher.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | [`FileSystemSyncMessage`](../type-aliases/FileSystemSyncMessage.md) |

#### Returns

`void`

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="property-watcher"></a> `watcher` | `readonly` | [`VirtualFSWatcher`](VirtualFSWatcher.md) | chokidar compatible [FSWatcher](VirtualFSWatcher.md). |
