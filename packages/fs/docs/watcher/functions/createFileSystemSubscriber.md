# Function: createFileSystemSubscriber()

Create a [FileSystemSubscriber](/packages/fs/docs/watcher/interfaces/FileSystemSubscriber.md) instance.

## Signature

```ts
export function createFileSystemSubscriber(fs: FileSystemInterfaces, options?: CreateFileSystemSubscriberOptions): Readonly<FileSystemSubscriber>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fs` | [`FileSystemInterfaces`](/packages/fs/docs/watcher/interfaces/FileSystemInterfaces.md) | fs instance to use for vol operations. Must be explicitly passed to avoid module instance mismatch when bundlers create separate copies of @vrowzer/fs. |
| `options` | [`CreateFileSystemSubscriberOptions`](/packages/fs/docs/watcher/interfaces/CreateFileSystemSubscriberOptions.md) | Options including optional external watcher _(optional)_ |

## Returns

`Readonly`\<[`FileSystemSubscriber`](/packages/fs/docs/watcher/interfaces/FileSystemSubscriber.md)\> — FileSystemSubscriber instance with a VirtualFSWatcher
