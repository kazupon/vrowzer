# Interface: CreateFileSystemSubscriberOptions

Options for [createFileSystemSubscriber](/packages/fs/docs/watcher/functions/createFileSystemSubscriber.md).

## Signature

```ts
export interface CreateFileSystemSubscriberOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `watcher` _(optional)_ | [`VirtualFSWatcher`](/packages/fs/docs/watcher/interfaces/VirtualFSWatcher.md) | External VirtualFSWatcher instance to use. If provided, the subscriber will use this watcher instead of creating a new one. This allows creating the watcher early (e.g. for DevEnvironment.init) and the subscriber later (e.g. after transformer loads). |
