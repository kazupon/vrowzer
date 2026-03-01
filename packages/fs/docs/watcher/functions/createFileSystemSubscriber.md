[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [watcher](../index.md) / createFileSystemSubscriber

# Function: createFileSystemSubscriber()

```ts
function createFileSystemSubscriber(fs, options?): Readonly<FileSystemSubscriber>;
```

Create a [FileSystemSubscriber](../interfaces/FileSystemSubscriber.md) instance.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `fs` | [`FileSystemInterfaces`](../interfaces/FileSystemInterfaces.md) | fs instance to use for vol operations. Must be explicitly passed to avoid module instance mismatch when bundlers create separate copies of @vrowser/fs. |
| `options?` | [`CreateFileSystemSubscriberOptions`](../interfaces/CreateFileSystemSubscriberOptions.md) | Options including optional external watcher |

## Returns

`Readonly`\<[`FileSystemSubscriber`](../interfaces/FileSystemSubscriber.md)\>

FileSystemSubscriber instance with a VirtualFSWatcher
