# Interface: FSInitMessage

Main Thread -> Worker: Initialize files in bulk.
Used during setup to populate the virtual filesystem.

Text files are in `files`, binary files are in `binaryFiles`.
The publisher transfers a copy of each binary ArrayBuffer to each target via postMessage's
transfer list, so the caller's ArrayBuffers stay usable.

## Signature

```ts
export interface FSInitMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `binaryFiles` _(optional)_ | `Record<string, ArrayBuffer>` | Binary files: path -> ArrayBuffer content (a copy transferred via postMessage's transfer list) |
| `files` _(optional)_ | `Record<string, string>` | Text files: path -> UTF-8 string content |
| `id` _(optional)_ | `string` | Operation ID. A Worker that applies the message can acknowledge it with [FSAckMessage](/packages/fs/docs/watcher/interfaces/FSAckMessage.md). |
| `type` | `"V_FS_INIT"` |  |
