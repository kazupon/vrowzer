[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / Volume

# Class: Volume

`Volume` represents a file system.

## Extended by

- [`IFs`](../namespaces/memfsExported/interfaces/IFs.md)

## Implements

- `FsCallbackApi`
- `FsSynchronousApi`

## Accessors

### promises

#### Get Signature

```ts
get promises(): FsPromisesApi;
```

##### Returns

`FsPromisesApi`

## Constructors

### Constructor

```ts
new Volume(_core?): Volume;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_core?` | `Superblock` |

#### Returns

`Volume`

## Methods

### createReadStream()

```ts
createReadStream(path, options?): IReadStream;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options?` | `string` \| `IReadStreamOptions` |

#### Returns

`IReadStream`

#### Implementation of

```ts
FsCallbackApi.createReadStream
```

***

### createWriteStream()

```ts
createWriteStream(path, options?): IWriteStream;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options?` | `string` \| `IWriteStreamOptions` |

#### Returns

`IWriteStream`

#### Implementation of

```ts
FsCallbackApi.createWriteStream
```

***

### fromBinarySnapshot()

```ts
fromBinarySnapshot(binary, path?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `binary` | `Uint8Array` |
| `path?` | `string` |

#### Returns

`void`

***

### fromJSON()

```ts
fromJSON(json, cwd?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`DirectoryJSON`](../interfaces/DirectoryJSON.md) |
| `cwd?` | `string` |

#### Returns

`void`

***

### fromJsonSnapshot()

```ts
fromJsonSnapshot(json, path?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | `string` |
| `path?` | `string` |

#### Returns

`void`

***

### fromNestedJSON()

```ts
fromNestedJSON(json, cwd?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`NestedDirectoryJSON`](../namespaces/memfsExported/interfaces/NestedDirectoryJSON.md) |
| `cwd?` | `string` |

#### Returns

`void`

***

### fromSnapshot()

```ts
fromSnapshot(snapshot, path?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `snapshot` | `SnapshotNode` |
| `path?` | `string` |

#### Returns

`void`

***

### fstat()

#### Call Signature

```ts
fstat(fd, callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.fstat
```

#### Call Signature

```ts
fstat(
   fd, 
   options, 
   callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | `IFStatOptions` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.fstat
```

***

### fstatSync()

#### Call Signature

```ts
fstatSync(fd): Stats<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |

##### Returns

`Stats`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.fstatSync
```

#### Call Signature

```ts
fstatSync(fd, options): Stats<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | \{ `bigint`: `false`; \} |
| `options.bigint` | `false` |

##### Returns

`Stats`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.fstatSync
```

#### Call Signature

```ts
fstatSync(fd, options): Stats<bigint>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | \{ `bigint`: `true`; \} |
| `options.bigint` | `true` |

##### Returns

`Stats`\<`bigint`\>

##### Implementation of

```ts
FsSynchronousApi.fstatSync
```

***

### lstat()

#### Call Signature

```ts
lstat(path, callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.lstat
```

#### Call Signature

```ts
lstat(
   path, 
   options, 
   callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IStatOptions` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.lstat
```

***

### mountSync()

```ts
mountSync(mountpoint, json): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mountpoint` | `string` |
| `json` | [`DirectoryJSON`](../interfaces/DirectoryJSON.md) |

#### Returns

`void`

***

### reset()

```ts
reset(): void;
```

#### Returns

`void`

***

### stat()

#### Call Signature

```ts
stat(path, callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.stat
```

#### Call Signature

```ts
stat(
   path, 
   options, 
   callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IStatOptions` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.stat
```

***

### statfs()

#### Call Signature

```ts
statfs(path, callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`StatFs`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.statfs
```

#### Call Signature

```ts
statfs(
   path, 
   options, 
   callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IStafsOptions` |
| `callback` | `TCallback`\<`StatFs`\<`TStatNumber`\>\> |

##### Returns

`void`

##### Implementation of

```ts
FsCallbackApi.statfs
```

***

### statfsSync()

#### Call Signature

```ts
statfsSync(path): StatFs<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |

##### Returns

`StatFs`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.statfsSync
```

#### Call Signature

```ts
statfsSync(path, options): StatFs<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `false`; \} |
| `options.bigint` | `false` |

##### Returns

`StatFs`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.statfsSync
```

#### Call Signature

```ts
statfsSync(path, options): StatFs<bigint>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `true`; \} |
| `options.bigint` | `true` |

##### Returns

`StatFs`\<`bigint`\>

##### Implementation of

```ts
FsSynchronousApi.statfsSync
```

***

### statSync()

#### Call Signature

```ts
statSync(path): Stats<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |

##### Returns

`Stats`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `throwIfNoEntry?`: `true`; \} |
| `options.throwIfNoEntry?` | `true` |

##### Returns

`Stats`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<number> | undefined;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `throwIfNoEntry`: `false`; \} |
| `options.throwIfNoEntry` | `false` |

##### Returns

`Stats`\<`number`\> \| `undefined`

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<number>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `false`; `throwIfNoEntry?`: `true`; \} |
| `options.bigint` | `false` |
| `options.throwIfNoEntry?` | `true` |

##### Returns

`Stats`\<`number`\>

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<bigint>;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `true`; `throwIfNoEntry?`: `true`; \} |
| `options.bigint` | `true` |
| `options.throwIfNoEntry?` | `true` |

##### Returns

`Stats`\<`bigint`\>

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<number> | undefined;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `false`; `throwIfNoEntry`: `false`; \} |
| `options.bigint` | `false` |
| `options.throwIfNoEntry` | `false` |

##### Returns

`Stats`\<`number`\> \| `undefined`

##### Implementation of

```ts
FsSynchronousApi.statSync
```

#### Call Signature

```ts
statSync(path, options): Stats<bigint> | undefined;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `true`; `throwIfNoEntry`: `false`; \} |
| `options.bigint` | `true` |
| `options.throwIfNoEntry` | `false` |

##### Returns

`Stats`\<`bigint`\> \| `undefined`

##### Implementation of

```ts
FsSynchronousApi.statSync
```

***

### toBinarySnapshot()

```ts
toBinarySnapshot(path?): Uint8Array;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path?` | `string` |

#### Returns

`Uint8Array`

***

### toJSON()

```ts
toJSON(
   paths?, 
   json?, 
   isRelative?, 
asBuffer?): DirectoryJSON<string | null>;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `paths?` | `PathLike` \| `PathLike`[] |
| `json?` | \{ \} |
| `isRelative?` | `boolean` |
| `asBuffer?` | `boolean` |

#### Returns

[`DirectoryJSON`](../interfaces/DirectoryJSON.md)\<`string` \| `null`\>

***

### toJsonSnapshot()

```ts
toJsonSnapshot(path?): string;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path?` | `string` |

#### Returns

`string`

***

### toSnapshot()

```ts
toSnapshot(path?): SnapshotNode;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path?` | `string` |

#### Returns

`SnapshotNode`

***

### toTree()

```ts
toTree(opts?): string;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `opts?` | `ToTreeOptions` |

#### Returns

`string`

***

### unwatchFile()

```ts
unwatchFile(path, listener?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `listener?` | (`curr`, `prev`) => `void` |

#### Returns

`void`

#### Implementation of

```ts
FsCallbackApi.unwatchFile
```

***

### watch()

```ts
watch(
   path, 
   options?, 
   listener?): FSWatcher;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options?` | `string` \| `IWatchOptions` |
| `listener?` | (`eventType`, `filename`) => `void` |

#### Returns

`FSWatcher`

#### Implementation of

```ts
FsCallbackApi.watch
```

***

### watchFile()

#### Call Signature

```ts
watchFile(path, listener): StatWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `listener` | (`curr`, `prev`) => `void` |

##### Returns

`StatWatcher`

##### Implementation of

```ts
FsCallbackApi.watchFile
```

#### Call Signature

```ts
watchFile(
   path, 
   options, 
   listener): StatWatcher;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IWatchFileOptions` |
| `listener` | (`curr`, `prev`) => `void` |

##### Returns

`StatWatcher`

##### Implementation of

```ts
FsCallbackApi.watchFile
```

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="property-_core"></a> `_core` | `readonly` | `Superblock` | - |
| <a id="property-access"></a> `access` | `public` | \{ (`path`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; \} | - |
| <a id="property-accesssync"></a> `accessSync` | `public` | (`path`, `mode?`) => `void` | - |
| <a id="property-appendfile"></a> `appendFile` | `public` | \{ (`id`, `data`, `callback`): `any`; (`id`, `data`, `options`, `callback`): `any`; \} | - |
| <a id="property-appendfilesync"></a> `appendFileSync` | `public` | (`id`, `data`, `options?`) => `void` | - |
| <a id="property-chmod"></a> `chmod` | `public` | (`path`, `mode`, `callback`) => `void` | - |
| <a id="property-chmodsync"></a> `chmodSync` | `public` | (`path`, `mode`) => `void` | - |
| <a id="property-chown"></a> `chown` | `public` | (`path`, `uid`, `gid`, `callback`) => `void` | - |
| <a id="property-chownsync"></a> `chownSync` | `public` | (`path`, `uid`, `gid`) => `void` | - |
| <a id="property-close"></a> `close` | `public` | (`fd`, `callback`) => `void` | - |
| <a id="property-closesync"></a> `closeSync` | `public` | (`fd`) => `void` | - |
| <a id="property-copyfile"></a> `copyFile` | `public` | \{ (`src`, `dest`, `callback`): `any`; (`src`, `dest`, `flags`, `callback`): `any`; \} | - |
| <a id="property-copyfilesync"></a> `copyFileSync` | `public` | (`src`, `dest`, `flags?`) => `void` | - |
| <a id="property-cp"></a> `cp` | `public` | \{ (`src`, `dest`, `callback`): `any`; (`src`, `dest`, `options`, `callback`): `any`; \} | - |
| <a id="property-cpsync"></a> `cpSync` | `public` | (`src`, `dest`, `options?`) => `void` | - |
| <a id="property-exists"></a> `exists` | `public` | (`path`, `callback`) => `void` | - |
| <a id="property-existssync"></a> `existsSync` | `public` | (`path`) => `boolean` | - |
| <a id="property-fchmod"></a> `fchmod` | `public` | (`fd`, `mode`, `callback`) => `void` | - |
| <a id="property-fchmodsync"></a> `fchmodSync` | `public` | (`fd`, `mode`) => `void` | - |
| <a id="property-fchown"></a> `fchown` | `public` | (`fd`, `uid`, `gid`, `callback`) => `void` | - |
| <a id="property-fchownsync"></a> `fchownSync` | `public` | (`fd`, `uid`, `gid`) => `void` | - |
| <a id="property-fdatasync"></a> `fdatasync` | `public` | (`fd`, `callback`) => `void` | - |
| <a id="property-fdatasyncsync"></a> `fdatasyncSync` | `public` | (`fd`) => `void` | - |
| <a id="property-fswatcher"></a> `FSWatcher` | `public` | () => `FSWatcher` | - |
| <a id="property-fsync"></a> `fsync` | `public` | (`fd`, `callback`) => `void` | - |
| <a id="property-fsyncsync"></a> `fsyncSync` | `public` | (`fd`) => `void` | - |
| <a id="property-ftruncate"></a> `ftruncate` | `public` | \{ (`fd`, `callback`): `any`; (`fd`, `len`, `callback`): `any`; \} | - |
| <a id="property-ftruncatesync"></a> `ftruncateSync` | `public` | (`fd`, `len?`) => `void` | - |
| <a id="property-futimes"></a> `futimes` | `public` | (`fd`, `atime`, `mtime`, `callback`) => `void` | - |
| <a id="property-futimessync"></a> `futimesSync` | `public` | (`fd`, `atime`, `mtime`) => `void` | - |
| <a id="property-glob"></a> `glob` | `public` | \{ (`pattern`, `callback`): `void`; (`pattern`, `options`, `callback`): `void`; \} | - |
| <a id="property-globsync"></a> `globSync` | `public` | (`pattern`, `options?`) => `string`[] | - |
| <a id="property-lchmod"></a> `lchmod` | `public` | (`path`, `mode`, `callback`) => `void` | - |
| <a id="property-lchmodsync"></a> `lchmodSync` | `public` | (`path`, `mode`) => `void` | - |
| <a id="property-lchown"></a> `lchown` | `public` | (`path`, `uid`, `gid`, `callback`) => `void` | - |
| <a id="property-lchownsync"></a> `lchownSync` | `public` | (`path`, `uid`, `gid`) => `void` | - |
| <a id="property-link"></a> `link` | `public` | (`existingPath`, `newPath`, `callback`) => `void` | - |
| <a id="property-linksync"></a> `linkSync` | `public` | (`existingPath`, `newPath`) => `void` | - |
| <a id="property-lstatsync"></a> `lstatSync` | `public` | \{ (`path`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`bigint`\>; (`path`, `options`): `Stats`\<`number`\> \| `undefined`; (`path`, `options`): `Stats`\<`number`\> \| `undefined`; (`path`, `options`): `Stats`\<`bigint`\> \| `undefined`; \} | - |
| <a id="property-lutimes"></a> `lutimes` | `public` | (`path`, `atime`, `mtime`, `callback`) => `void` | - |
| <a id="property-lutimessync"></a> `lutimesSync` | `public` | (`path`, `atime`, `mtime`) => `void` | - |
| <a id="property-mkdir"></a> `mkdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; \} | - |
| <a id="property-mkdirsync"></a> `mkdirSync` | `public` | \{ (`path`, `options`): `string` \| `undefined`; (`path`, `options?`): `void`; (`path`, `options?`): `string` \| `undefined`; \} | - |
| <a id="property-mkdtemp"></a> `mkdtemp` | `public` | \{ (`prefix`, `callback`): `any`; (`prefix`, `options`, `callback`): `any`; \} | - |
| <a id="property-mkdtempsync"></a> `mkdtempSync` | `public` | (`prefix`, `options?`) => `TDataOut` | - |
| <a id="property-open"></a> `open` | `public` | \{ (`path`, `flags`, `callback`): `void`; (`path`, `flags`, `mode`, `callback`): `void`; \} | - |
| <a id="property-openasblob"></a> `openAsBlob` | `public` | (`path`, `options?`) => `Promise`\<`Blob`\> | - |
| <a id="property-opendir"></a> `opendir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - |
| <a id="property-opendirsync"></a> `opendirSync` | `public` | (`path`, `options?`) => `Dir` | - |
| <a id="property-opensync"></a> `openSync` | `public` | (`path`, `flags`, `mode?`) => `number` | - |
| <a id="property-read"></a> `read` | `public` | (`fd`, `buffer`, `offset`, `length`, `position`, `callback`) => `void` | - |
| <a id="property-readdir"></a> `readdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - |
| <a id="property-readdirsync"></a> `readdirSync` | `public` | (`path`, `options?`) => `TDataOut`[] \| `Dirent`[] | - |
| <a id="property-readfile"></a> `readFile` | `public` | \{ (`id`, `callback`): `any`; (`id`, `options`, `callback`): `any`; \} | - |
| <a id="property-readfilesync"></a> `readFileSync` | `public` | (`file`, `options?`) => `TDataOut` | - |
| <a id="property-readlink"></a> `readlink` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - |
| <a id="property-readlinksync"></a> `readlinkSync` | `public` | (`path`, `options?`) => `TDataOut` | - |
| <a id="property-readstream"></a> `ReadStream` | `public` | (...`args`) => `IReadStream` | - |
| <a id="property-readsync"></a> `readSync` | `public` | (`fd`, `buffer`, `offset`, `length`, `position`) => `number` | - |
| <a id="property-readv"></a> `readv` | `public` | \{ (`fd`, `buffers`, `callback`): `void`; (`fd`, `buffers`, `position`, `callback`): `void`; \} | - |
| <a id="property-readvsync"></a> `readvSync` | `public` | (`fd`, `buffers`, `position?`) => `number` | - |
| <a id="property-realpath"></a> `realpath` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; `native`: \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \}; \} | - |
| `realpath.native` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \} | - |
| <a id="property-realpathsync"></a> `realpathSync` | `public` | \{ (`path`, `options?`): `TDataOut`; `native`: (`path`, `options?`) => `TDataOut`; \} | - |
| `realpathSync.native` | `public` | (`path`, `options?`) => `TDataOut` | - |
| <a id="property-rename"></a> `rename` | `public` | (`oldPath`, `newPath`, `callback`) => `void` | - |
| <a id="property-renamesync"></a> `renameSync` | `public` | (`oldPath`, `newPath`) => `void` | - |
| <a id="property-rm"></a> `rm` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \} | - |
| <a id="property-rmdir"></a> `rmdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - |
| <a id="property-rmdirsync"></a> `rmdirSync` | `public` | (`path`, `options?`) => `void` | - |
| <a id="property-rmsync"></a> `rmSync` | `public` | (`path`, `options?`) => `void` | - |
| <a id="property-statwatcher"></a> `StatWatcher` | `public` | () => `StatWatcher` | - |
| <a id="property-symlink"></a> `symlink` | `public` | \{ (`target`, `path`, `callback`): `any`; (`target`, `path`, `type`, `callback`): `any`; \} | - |
| <a id="property-symlinksync"></a> `symlinkSync` | `public` | (`target`, `path`, `type?`) => `void` | `type` argument works only on Windows. |
| <a id="property-truncate"></a> `truncate` | `public` | \{ (`id`, `callback`): `any`; (`id`, `len`, `callback`): `any`; \} | - |
| <a id="property-truncatesync"></a> `truncateSync` | `public` | (`id`, `len?`) => `void` | `id` should be a file descriptor or a path. `id` as file descriptor will not be supported soon. |
| <a id="property-unlink"></a> `unlink` | `public` | (`path`, `callback`) => `void` | - |
| <a id="property-unlinksync"></a> `unlinkSync` | `public` | (`path`) => `void` | - |
| <a id="property-utimes"></a> `utimes` | `public` | (`path`, `atime`, `mtime`, `callback`) => `void` | - |
| <a id="property-utimessync"></a> `utimesSync` | `public` | (`path`, `atime`, `mtime`) => `void` | - |
| <a id="property-write"></a> `write` | `public` | \{ (`fd`, `buffer`, `callback`): `any`; (`fd`, `buffer`, `offset`, `callback`): `any`; (`fd`, `buffer`, `offset`, `length`, `callback`): `any`; (`fd`, `buffer`, `offset`, `length`, `position`, `callback`): `any`; (`fd`, `str`, `callback`): `any`; (`fd`, `str`, `position`, `callback`): `any`; (`fd`, `str`, `position`, `encoding`, `callback`): `any`; \} | - |
| <a id="property-writefile"></a> `writeFile` | `public` | \{ (`id`, `data`, `callback`): `void`; (`id`, `data`, `options`, `callback`): `void`; \} | - |
| <a id="property-writefilesync"></a> `writeFileSync` | `public` | (`id`, `data`, `options?`) => `void` | - |
| <a id="property-writestream"></a> `WriteStream` | `public` | (...`args`) => `IWriteStream` | - |
| <a id="property-writesync"></a> `writeSync` | `public` | \{ (`fd`, `buffer`, `offset?`, `length?`, `position?`): `number`; (`fd`, `str`, `position?`, `encoding?`): `number`; \} | - |
| <a id="property-writev"></a> `writev` | `public` | \{ (`fd`, `buffers`, `callback`): `void`; (`fd`, `buffers`, `position`, `callback`): `void`; \} | - |
| <a id="property-writevsync"></a> `writevSync` | `public` | (`fd`, `buffers`, `position?`) => `number` | - |
| <a id="property-fromjson"></a> `fromJSON` | `readonly` | (`json`, `cwd?`) => `Volume` | - |
| <a id="property-fromnestedjson"></a> `fromNestedJSON` | `readonly` | (`json`, `cwd?`) => `Volume` | - |
