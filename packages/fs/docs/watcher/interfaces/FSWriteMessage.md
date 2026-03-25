[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / FSWriteMessage

# Interface: FSWriteMessage

Main Thread -> Worker: Write (create or update) a file.

For text files:
  { type: 'V_FS_WRITE', path: '/main.js', encoding: 'text', content: '...' }
  -> postMessage(message)

For binary files:
  { type: 'V_FS_WRITE', path: '/image.png', encoding: 'binary', content: ArrayBuffer }
  -> postMessage(message, [message.content])  // transfer list

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-content"></a> `content` | `string` \| `ArrayBuffer` | Content of the file. Type depends on encoding: - 'text': UTF-8 string content - 'binary': ArrayBuffer content (transferred via postMessage's transfer list) |
| <a id="property-encoding"></a> `encoding` | [`FSContentEncoding`](../type-aliases/FSContentEncoding.md) | Encoding of the content. Determines how the Worker should interpret the content. |
| <a id="property-path"></a> `path` | `string` | Path of the file to write. Must not end with '/' (directories use FS_MKDIR with path ending in '/'). |
| <a id="property-type"></a> `type` | `"V_FS_WRITE"` | - |
