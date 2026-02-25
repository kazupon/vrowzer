[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [watcher](../index.md) / FSInitMessage

# Interface: FSInitMessage

Main Thread -> Worker: Initialize files in bulk.
Used during setup to populate the virtual filesystem.

Text files are in `files`, binary files are in `binaryFiles`.
Binary ArrayBuffers are transferred via postMessage's transfer list.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-binaryfiles"></a> `binaryFiles?` | `Record`\<`string`, `ArrayBuffer`\> | Binary files: path -> ArrayBuffer content (transferred) |
| <a id="property-files"></a> `files?` | `Record`\<`string`, `string`\> | Text files: path -> UTF-8 string content |
| <a id="property-type"></a> `type` | `"V_FS_INIT"` | - |
