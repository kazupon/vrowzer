# Interface: FileSystemPublishOptions

Options for a single [FileSystemPublisher](/packages/fs/docs/watcher/interfaces/FileSystemPublisher.md) operation.

## Signature

```ts
export interface FileSystemPublishOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `id` _(optional)_ | `string` | Operation ID set on the message, so that a Worker can acknowledge it with `V_FS_ACK`. |
