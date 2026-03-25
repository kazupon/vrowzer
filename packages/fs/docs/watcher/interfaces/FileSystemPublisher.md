[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / FileSystemPublisher

# Interface: FileSystemPublisher

Publisher for broadcasting filesystem operations to Workers.

API is modeled after `node:fs` for familiarity:
- `writeFile` accepts both `string` (text) and `ArrayBuffer` (binary)
- `unlink` deletes a file
- `mkdir` creates a directory

## Methods

### addTarget()

```ts
addTarget(target): void;
```

Add a postMessage target.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `target` | [`FileSystemPublisherTarget`](FileSystemPublisherTarget.md) | The target to add (e.g. Worker, ServiceWorker) |

#### Returns

`void`

***

### initFiles()

```ts
initFiles(files?, binaryFiles?): void;
```

Initialize files in bulk.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `files?` | `Record`\<`string`, `string`\> | Text files: path -> UTF-8 string content |
| `binaryFiles?` | `Record`\<`string`, `ArrayBuffer`\> | Binary files: path -> ArrayBuffer content (transferred) |

#### Returns

`void`

***

### mkdir()

```ts
mkdir(path): void;
```

Create a directory.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `string` | Path of the directory to create. Must end with '/' to distinguish from files. |

#### Returns

`void`

***

### removeTarget()

```ts
removeTarget(target): void;
```

Remove a postMessage target.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `target` | [`FileSystemPublisherTarget`](FileSystemPublisherTarget.md) | The target to remove (e.g. Worker, ServiceWorker) |

#### Returns

`void`

***

### unlink()

```ts
unlink(path): void;
```

Delete a file.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `string` | Path of the file to delete. Must not end with '/' (directories use mkdir with path ending in '/'). |

#### Returns

`void`

***

### writeFile()

```ts
writeFile(path, content): void;
```

Write a file. Encoding is inferred: string → text, ArrayBuffer → binary.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `string` | Path of the file to write. Must not end with '/' (directories use mkdir with path ending in '/'). |
| `content` | `string` \| `ArrayBuffer` | Content of the file. Type determines encoding: - string: UTF-8 text content - ArrayBuffer: binary content (transferred via postMessage's transfer list for zero-copy performance) |

#### Returns

`void`
