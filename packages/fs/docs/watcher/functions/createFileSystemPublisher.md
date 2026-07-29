# Function: createFileSystemPublisher()

Create a [FileSystemPublisher](/packages/fs/docs/watcher/interfaces/FileSystemPublisher.md) instance.

## Signature

```ts
export function createFileSystemPublisher(targets?: FileSystemPublisherTarget[]): Readonly<FileSystemPublisher>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `targets` | [`FileSystemPublisherTarget`](/packages/fs/docs/watcher/interfaces/FileSystemPublisherTarget.md)\[\] | Initial postMessage targets (e.g. Worker, ServiceWorker) _(optional)_ |

## Returns

`Readonly`\<[`FileSystemPublisher`](/packages/fs/docs/watcher/interfaces/FileSystemPublisher.md)\> — FileSystemPublisher instance
