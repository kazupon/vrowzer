# Interface: FSUnlinkMessage

Main Thread -> Worker: Delete a file.

## Signature

```ts
export interface FSUnlinkMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path of the file to delete. Must not end with '/' (directories use FS_MKDIR with path ending in '/'). |
| `type` | `"V_FS_UNLINK"` |  |
