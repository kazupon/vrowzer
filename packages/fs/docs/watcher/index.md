# watcher

Virtual filesystem watcher with Pub-Sub sync protocol.

## Variables

| Variable | Description |
| ------ | ------ |
| [V_FS_INIT](/packages/fs/docs/watcher/variables/V_FS_INIT.md) |  |
| [V_FS_MKDIR](/packages/fs/docs/watcher/variables/V_FS_MKDIR.md) |  |
| [V_FS_UNLINK](/packages/fs/docs/watcher/variables/V_FS_UNLINK.md) |  |
| [V_FS_WRITE](/packages/fs/docs/watcher/variables/V_FS_WRITE.md) |  |

## Functions

| Function | Description |
| ------ | ------ |
| [createFileSystemPublisher](/packages/fs/docs/watcher/functions/createFileSystemPublisher.md) | Create a [FileSystemPublisher](/packages/fs/docs/watcher/interfaces/FileSystemPublisher.md) instance. |
| [createFileSystemSubscriber](/packages/fs/docs/watcher/functions/createFileSystemSubscriber.md) | Create a [FileSystemSubscriber](/packages/fs/docs/watcher/interfaces/FileSystemSubscriber.md) instance. |
| [createVirtualFSWatcher](/packages/fs/docs/watcher/functions/createVirtualFSWatcher.md) | Create a VirtualFSWatcher instance. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CreateFileSystemSubscriberOptions](/packages/fs/docs/watcher/interfaces/CreateFileSystemSubscriberOptions.md) | Options for [createFileSystemSubscriber](/packages/fs/docs/watcher/functions/createFileSystemSubscriber.md). |
| [FileSystemInterfaces](/packages/fs/docs/watcher/interfaces/FileSystemInterfaces.md) | Minimal fs interface required by FileSystemSubscriber. |
| [FileSystemPublisher](/packages/fs/docs/watcher/interfaces/FileSystemPublisher.md) | Publisher for broadcasting filesystem operations to Workers. |
| [FileSystemPublisherTarget](/packages/fs/docs/watcher/interfaces/FileSystemPublisherTarget.md) | A postMessage target compatible like Service Worker and Web Worker APIs. |
| [FileSystemSubscriber](/packages/fs/docs/watcher/interfaces/FileSystemSubscriber.md) | Subscriber for processing filesystem sync messages in Workers. |
| [FSInitMessage](/packages/fs/docs/watcher/interfaces/FSInitMessage.md) | Main Thread -> Worker: Initialize files in bulk. Used during setup to populate the virtual filesystem. |
| [FSMkdirMessage](/packages/fs/docs/watcher/interfaces/FSMkdirMessage.md) | Main Thread -> Worker: Create a directory. |
| [FSUnlinkMessage](/packages/fs/docs/watcher/interfaces/FSUnlinkMessage.md) | Main Thread -> Worker: Delete a file. |
| [FSWriteMessage](/packages/fs/docs/watcher/interfaces/FSWriteMessage.md) | Main Thread -> Worker: Write (create or update) a file. |
| [VirtualFSWatcher](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md) | chokidar compatible FSWatcher interface for virtual filesystems. |
| [VirtualWatchOptions](/packages/fs/docs/watcher/interfaces/VirtualWatchOptions.md) | Watch options for VirtualFSWatcher. Uses an index signature for structural compatibility with chokidar's WatchOptions. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [FileSystemSyncMessage](/packages/fs/docs/watcher/type-aliases/FileSystemSyncMessage.md) |  |
| [FSContentEncoding](/packages/fs/docs/watcher/type-aliases/FSContentEncoding.md) | File content encoding type. - 'text': UTF-8 string content (JS, TS, JSON, CSS, HTML, etc.) - 'binary': ArrayBuffer content (images, WASM, fonts, etc.) |
| [WatchEventName](/packages/fs/docs/watcher/type-aliases/WatchEventName.md) |  |

