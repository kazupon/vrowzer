[**@vrowser/fs**](../index.md)

***

[@vrowser/fs](../index.md) / watcher

# watcher

Virtual filesystem watcher with Pub-Sub sync protocol.

## Variables

| Variable | Description |
| ------ | ------ |
| [V\_FS\_INIT](variables/V_FS_INIT.md) | - |
| [V\_FS\_MKDIR](variables/V_FS_MKDIR.md) | - |
| [V\_FS\_UNLINK](variables/V_FS_UNLINK.md) | - |
| [V\_FS\_WRITE](variables/V_FS_WRITE.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [createFileSystemPublisher](functions/createFileSystemPublisher.md) | Create a [FileSystemPublisher](interfaces/FileSystemPublisher.md) instance. |
| [createFileSystemSubscriber](functions/createFileSystemSubscriber.md) | Create a [FileSystemSubscriber](interfaces/FileSystemSubscriber.md) instance. |
| [createVirtualFSWatcher](functions/createVirtualFSWatcher.md) | Create a VirtualFSWatcher instance. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [FileSystemPublisher](interfaces/FileSystemPublisher.md) | Publisher for broadcasting filesystem operations to Workers. |
| [FileSystemPublisherTarget](interfaces/FileSystemPublisherTarget.md) | A postMessage target compatible like Service Worker and Web Worker APIs. |
| [FileSystemSubscriber](interfaces/FileSystemSubscriber.md) | Subscriber for processing filesystem sync messages in Workers. |
| [FSInitMessage](interfaces/FSInitMessage.md) | Main Thread -> Worker: Initialize files in bulk. Used during setup to populate the virtual filesystem. |
| [FSMkdirMessage](interfaces/FSMkdirMessage.md) | Main Thread -> Worker: Create a directory. |
| [FSUnlinkMessage](interfaces/FSUnlinkMessage.md) | Main Thread -> Worker: Delete a file. |
| [FSWriteMessage](interfaces/FSWriteMessage.md) | Main Thread -> Worker: Write (create or update) a file. |
| [VirtualFSWatcher](interfaces/VirtualFSWatcher.md) | chokidar compatible FSWatcher interface for virtual filesystems. |
| [VirtualWatchOptions](interfaces/VirtualWatchOptions.md) | Watch options for VirtualFSWatcher. Uses an index signature for structural compatibility with chokidar's WatchOptions. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [FileSystemSyncMessage](type-aliases/FileSystemSyncMessage.md) | - |
| [FSContentEncoding](type-aliases/FSContentEncoding.md) | File content encoding type. - 'text': UTF-8 string content (JS, TS, JSON, CSS, HTML, etc.) - 'binary': ArrayBuffer content (images, WASM, fonts, etc.) |
| [WatchEventName](type-aliases/WatchEventName.md) | - |
