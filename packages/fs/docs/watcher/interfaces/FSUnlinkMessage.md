[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [watcher](../index.md) / FSUnlinkMessage

# Interface: FSUnlinkMessage

Main Thread -> Worker: Delete a file.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-path"></a> `path` | `string` | Path of the file to delete. Must not end with '/' (directories use FS_MKDIR with path ending in '/'). |
| <a id="property-type"></a> `type` | `"V_FS_UNLINK"` | - |
