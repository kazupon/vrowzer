# Interface: FSMkdirMessage

Main Thread -> Worker: Create a directory.

## Signature

```ts
export interface FSMkdirMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path of the directory to create. Must end with '/' to distinguish from files. |
| `type` | `"V_FS_MKDIR"` |  |
