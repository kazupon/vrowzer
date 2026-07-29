# Interface: FSInitMessage

Main Thread -> Worker: Initialize files in bulk.
Used during setup to populate the virtual filesystem.

Text files are in `files`, binary files are in `binaryFiles`.
Binary ArrayBuffers are transferred via postMessage's transfer list.

## Signature

```ts
export interface FSInitMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `binaryFiles` _(optional)_ | `Record<string, ArrayBuffer>` | Binary files: path -> ArrayBuffer content (transferred) |
| `files` _(optional)_ | `Record<string, string>` | Text files: path -> UTF-8 string content |
| `type` | `"V_FS_INIT"` |  |
