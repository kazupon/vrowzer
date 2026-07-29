# Interface: FSWriteMessage

Main Thread -> Worker: Write (create or update) a file.

For text files:
  { type: 'V_FS_WRITE', path: '/main.js', encoding: 'text', content: '...' }
  -> postMessage(message)

For binary files:
  { type: 'V_FS_WRITE', path: '/image.png', encoding: 'binary', content: ArrayBuffer }
  -> postMessage(message, [message.content])  // transfer list

## Signature

```ts
export interface FSWriteMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `content` | `string \| ArrayBuffer` | Content of the file. Type depends on encoding: - 'text': UTF-8 string content - 'binary': ArrayBuffer content (transferred via postMessage's transfer list) |
| `encoding` | [`FSContentEncoding`](/packages/fs/docs/watcher/type-aliases/FSContentEncoding.md) | Encoding of the content. Determines how the Worker should interpret the content. |
| `path` | `string` | Path of the file to write. Must not end with '/' (directories use FS_MKDIR with path ending in '/'). |
| `type` | `"V_FS_WRITE"` |  |
