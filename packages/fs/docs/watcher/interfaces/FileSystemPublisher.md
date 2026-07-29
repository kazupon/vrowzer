# Interface: FileSystemPublisher

Publisher for broadcasting filesystem operations to Workers.

API is modeled after `node:fs` for familiarity:
- `writeFile` accepts both `string` (text) and `ArrayBuffer` (binary)
- `unlink` deletes a file
- `mkdir` creates a directory

## Signature

```ts
export interface FileSystemPublisher
```

## Methods

### addTarget()

```ts
addTarget(target: FileSystemPublisherTarget): void;
```

Add a postMessage target.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | [`FileSystemPublisherTarget`](/packages/fs/docs/watcher/interfaces/FileSystemPublisherTarget.md) | The target to add (e.g. Worker, ServiceWorker) |

#### Returns

`void`

***

### initFiles()

```ts
initFiles(files?: Record<string, string>, binaryFiles?: Record<string, ArrayBuffer>): void;
```

Initialize files in bulk.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `files` | `Record<string, string>` | Text files: path -> UTF-8 string content _(optional)_ |
| `binaryFiles` | `Record<string, ArrayBuffer>` | Binary files: path -> ArrayBuffer content (transferred) _(optional)_ |

#### Returns

`void`

***

### mkdir()

```ts
mkdir(path: string): void;
```

Create a directory.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path of the directory to create. Must end with '/' to distinguish from files. |

#### Returns

`void`

***

### removeTarget()

```ts
removeTarget(target: FileSystemPublisherTarget): void;
```

Remove a postMessage target.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | [`FileSystemPublisherTarget`](/packages/fs/docs/watcher/interfaces/FileSystemPublisherTarget.md) | The target to remove (e.g. Worker, ServiceWorker) |

#### Returns

`void`

***

### unlink()

```ts
unlink(path: string): void;
```

Delete a file.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path of the file to delete. Must not end with '/' (directories use mkdir with path ending in '/'). |

#### Returns

`void`

***

### writeFile()

```ts
writeFile(path: string, content: string | ArrayBuffer): void;
```

Write a file. Encoding is inferred: string → text, ArrayBuffer → binary.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path of the file to write. Must not end with '/' (directories use mkdir with path ending in '/'). |
| `content` | `string \| ArrayBuffer` | Content of the file. Type determines encoding: - string: UTF-8 text content - ArrayBuffer: binary content (transferred via postMessage's transfer list for zero-copy performance) |

#### Returns

`void`
