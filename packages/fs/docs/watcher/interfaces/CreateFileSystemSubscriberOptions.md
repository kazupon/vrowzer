[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / CreateFileSystemSubscriberOptions

# Interface: CreateFileSystemSubscriberOptions

Options for [createFileSystemSubscriber](../functions/createFileSystemSubscriber.md).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-watcher"></a> `watcher?` | [`VirtualFSWatcher`](VirtualFSWatcher.md) | External VirtualFSWatcher instance to use. If provided, the subscriber will use this watcher instead of creating a new one. This allows creating the watcher early (e.g. for DevEnvironment.init) and the subscriber later (e.g. after transformer loads). |
