[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / createFileSystemPublisher

# Function: createFileSystemPublisher()

```ts
function createFileSystemPublisher(targets?): Readonly<FileSystemPublisher>;
```

Create a [FileSystemPublisher](../interfaces/FileSystemPublisher.md) instance.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `targets?` | [`FileSystemPublisherTarget`](../interfaces/FileSystemPublisherTarget.md)[] | Initial postMessage targets (e.g. Worker, ServiceWorker) |

## Returns

`Readonly`\<[`FileSystemPublisher`](../interfaces/FileSystemPublisher.md)\>

FileSystemPublisher instance
