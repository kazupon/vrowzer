[**@vrowzer/fs**](../../../../index.md)

***

[@vrowzer/fs](../../../../index.md) / [default](../../../index.md) / [memfsExported](../index.md) / IFs

# Interface: IFs

`Volume` represents a file system.

## Extends

- [`Volume`](../../../classes/Volume.md)

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

#### Inherited from

```ts
Volume.createReadStream
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

#### Inherited from

```ts
Volume.createWriteStream
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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`fromBinarySnapshot`](../../../classes/Volume.md#frombinarysnapshot)

***

### fromJSON()

```ts
fromJSON(json, cwd?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`DirectoryJSON`](../../../interfaces/DirectoryJSON.md) |
| `cwd?` | `string` |

#### Returns

`void`

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`fromJSON`](../../../classes/Volume.md#fromjson)

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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`fromJsonSnapshot`](../../../classes/Volume.md#fromjsonsnapshot)

***

### fromNestedJSON()

```ts
fromNestedJSON(json, cwd?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`NestedDirectoryJSON`](NestedDirectoryJSON.md) |
| `cwd?` | `string` |

#### Returns

`void`

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`fromNestedJSON`](../../../classes/Volume.md#fromnestedjson)

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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`fromSnapshot`](../../../classes/Volume.md#fromsnapshot)

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

##### Inherited from

```ts
Volume.fstat
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

##### Inherited from

```ts
Volume.fstat
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

##### Inherited from

```ts
Volume.fstatSync
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

##### Inherited from

```ts
Volume.fstatSync
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

##### Inherited from

```ts
Volume.fstatSync
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

##### Inherited from

```ts
Volume.lstat
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

##### Inherited from

```ts
Volume.lstat
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
| `json` | [`DirectoryJSON`](../../../interfaces/DirectoryJSON.md) |

#### Returns

`void`

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`mountSync`](../../../classes/Volume.md#mountsync)

***

### reset()

```ts
reset(): void;
```

#### Returns

`void`

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`reset`](../../../classes/Volume.md#reset)

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

##### Inherited from

```ts
Volume.stat
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

##### Inherited from

```ts
Volume.stat
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

##### Inherited from

[`Volume`](../../../classes/Volume.md).[`statfs`](../../../classes/Volume.md#statfs)

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

##### Inherited from

[`Volume`](../../../classes/Volume.md).[`statfs`](../../../classes/Volume.md#statfs)

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

##### Inherited from

[`Volume`](../../../classes/Volume.md).[`statfsSync`](../../../classes/Volume.md#statfssync)

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

##### Inherited from

[`Volume`](../../../classes/Volume.md).[`statfsSync`](../../../classes/Volume.md#statfssync)

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

##### Inherited from

[`Volume`](../../../classes/Volume.md).[`statfsSync`](../../../classes/Volume.md#statfssync)

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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

##### Inherited from

```ts
Volume.statSync
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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`toBinarySnapshot`](../../../classes/Volume.md#tobinarysnapshot)

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

[`DirectoryJSON`](../../../interfaces/DirectoryJSON.md)\<`string` \| `null`\>

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`toJSON`](../../../classes/Volume.md#tojson)

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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`toJsonSnapshot`](../../../classes/Volume.md#tojsonsnapshot)

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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`toSnapshot`](../../../classes/Volume.md#tosnapshot)

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

#### Inherited from

[`Volume`](../../../classes/Volume.md).[`toTree`](../../../classes/Volume.md#totree)

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

#### Inherited from

```ts
Volume.unwatchFile
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

#### Inherited from

```ts
Volume.watch
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

##### Inherited from

```ts
Volume.watchFile
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

##### Inherited from

```ts
Volume.watchFile
```

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-_core"></a> `_core` | `readonly` | `Superblock` | - | - | [`Volume`](../../../classes/Volume.md).[`_core`](../../../classes/Volume.md#property-_core) |
| <a id="property-_tounixtimestamp"></a> `_toUnixTimestamp` | `public` | `any` | - | - | - |
| <a id="property-access"></a> `access` | `public` | \{ (`path`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`access`](../../../classes/Volume.md#property-access) |
| <a id="property-accesssync"></a> `accessSync` | `public` | (`path`, `mode?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`accessSync`](../../../classes/Volume.md#property-accesssync) |
| <a id="property-appendfile"></a> `appendFile` | `public` | \{ (`id`, `data`, `callback`): `any`; (`id`, `data`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`appendFile`](../../../classes/Volume.md#property-appendfile) |
| <a id="property-appendfilesync"></a> `appendFileSync` | `public` | (`id`, `data`, `options?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`appendFileSync`](../../../classes/Volume.md#property-appendfilesync) |
| <a id="property-chmod"></a> `chmod` | `public` | (`path`, `mode`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`chmod`](../../../classes/Volume.md#property-chmod) |
| <a id="property-chmodsync"></a> `chmodSync` | `public` | (`path`, `mode`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`chmodSync`](../../../classes/Volume.md#property-chmodsync) |
| <a id="property-chown"></a> `chown` | `public` | (`path`, `uid`, `gid`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`chown`](../../../classes/Volume.md#property-chown) |
| <a id="property-chownsync"></a> `chownSync` | `public` | (`path`, `uid`, `gid`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`chownSync`](../../../classes/Volume.md#property-chownsync) |
| <a id="property-close"></a> `close` | `public` | (`fd`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`close`](../../../classes/Volume.md#property-close) |
| <a id="property-closesync"></a> `closeSync` | `public` | (`fd`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`closeSync`](../../../classes/Volume.md#property-closesync) |
| <a id="property-constants"></a> `constants` | `public` | `object` | - | - | - |
| `constants.COPYFILE_EXCL` | `public` | `number` | - | - | - |
| `constants.COPYFILE_FICLONE` | `public` | `number` | - | - | - |
| `constants.COPYFILE_FICLONE_FORCE` | `public` | `number` | - | - | - |
| `constants.F_OK` | `public` | `number` | - | - | - |
| `constants.O_APPEND` | `public` | `number` | - | - | - |
| `constants.O_CREAT` | `public` | `number` | - | - | - |
| `constants.O_DIRECT` | `public` | `number` | - | - | - |
| `constants.O_DIRECTORY` | `public` | `number` | - | - | - |
| `constants.O_EXCL` | `public` | `number` | - | - | - |
| `constants.O_NOATIME` | `public` | `number` | - | - | - |
| `constants.O_NOCTTY` | `public` | `number` | - | - | - |
| `constants.O_NOFOLLOW` | `public` | `number` | - | - | - |
| `constants.O_NONBLOCK` | `public` | `number` | - | - | - |
| `constants.O_RDONLY` | `public` | `number` | - | - | - |
| `constants.O_RDWR` | `public` | `number` | - | - | - |
| `constants.O_SYMLINK` | `public` | `number` | - | - | - |
| `constants.O_SYNC` | `public` | `number` | - | - | - |
| `constants.O_TRUNC` | `public` | `number` | - | - | - |
| `constants.O_WRONLY` | `public` | `number` | - | - | - |
| `constants.R_OK` | `public` | `number` | - | - | - |
| `constants.S_IFBLK` | `public` | `number` | - | - | - |
| `constants.S_IFCHR` | `public` | `number` | - | - | - |
| `constants.S_IFDIR` | `public` | `number` | - | - | - |
| `constants.S_IFIFO` | `public` | `number` | - | - | - |
| `constants.S_IFLNK` | `public` | `number` | - | - | - |
| `constants.S_IFMT` | `public` | `number` | - | - | - |
| `constants.S_IFREG` | `public` | `number` | - | - | - |
| `constants.S_IFSOCK` | `public` | `number` | - | - | - |
| `constants.S_IRGRP` | `public` | `number` | - | - | - |
| `constants.S_IROTH` | `public` | `number` | - | - | - |
| `constants.S_IRUSR` | `public` | `number` | - | - | - |
| `constants.S_IRWXG` | `public` | `number` | - | - | - |
| `constants.S_IRWXO` | `public` | `number` | - | - | - |
| `constants.S_IRWXU` | `public` | `number` | - | - | - |
| `constants.S_IWGRP` | `public` | `number` | - | - | - |
| `constants.S_IWOTH` | `public` | `number` | - | - | - |
| `constants.S_IWUSR` | `public` | `number` | - | - | - |
| `constants.S_IXGRP` | `public` | `number` | - | - | - |
| `constants.S_IXOTH` | `public` | `number` | - | - | - |
| `constants.S_IXUSR` | `public` | `number` | - | - | - |
| `constants.UV_FS_COPYFILE_EXCL` | `public` | `number` | - | - | - |
| `constants.UV_FS_COPYFILE_FICLONE` | `public` | `number` | - | - | - |
| `constants.UV_FS_COPYFILE_FICLONE_FORCE` | `public` | `number` | - | - | - |
| `constants.UV_FS_SYMLINK_DIR` | `public` | `number` | - | - | - |
| `constants.UV_FS_SYMLINK_JUNCTION` | `public` | `number` | - | - | - |
| `constants.W_OK` | `public` | `number` | - | - | - |
| `constants.X_OK` | `public` | `number` | - | - | - |
| <a id="property-copyfile"></a> `copyFile` | `public` | \{ (`src`, `dest`, `callback`): `any`; (`src`, `dest`, `flags`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`copyFile`](../../../classes/Volume.md#property-copyfile) |
| <a id="property-copyfilesync"></a> `copyFileSync` | `public` | (`src`, `dest`, `flags?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`copyFileSync`](../../../classes/Volume.md#property-copyfilesync) |
| <a id="property-cp"></a> `cp` | `public` | \{ (`src`, `dest`, `callback`): `any`; (`src`, `dest`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`cp`](../../../classes/Volume.md#property-cp) |
| <a id="property-cpsync"></a> `cpSync` | `public` | (`src`, `dest`, `options?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`cpSync`](../../../classes/Volume.md#property-cpsync) |
| <a id="property-dirent"></a> `Dirent` | `public` | (...`args`) => `Dirent` | - | - | - |
| <a id="property-exists"></a> `exists` | `public` | (`path`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`exists`](../../../classes/Volume.md#property-exists) |
| <a id="property-existssync"></a> `existsSync` | `public` | (`path`) => `boolean` | - | - | [`Volume`](../../../classes/Volume.md).[`existsSync`](../../../classes/Volume.md#property-existssync) |
| <a id="property-fchmod"></a> `fchmod` | `public` | (`fd`, `mode`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fchmod`](../../../classes/Volume.md#property-fchmod) |
| <a id="property-fchmodsync"></a> `fchmodSync` | `public` | (`fd`, `mode`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fchmodSync`](../../../classes/Volume.md#property-fchmodsync) |
| <a id="property-fchown"></a> `fchown` | `public` | (`fd`, `uid`, `gid`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fchown`](../../../classes/Volume.md#property-fchown) |
| <a id="property-fchownsync"></a> `fchownSync` | `public` | (`fd`, `uid`, `gid`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fchownSync`](../../../classes/Volume.md#property-fchownsync) |
| <a id="property-fdatasync"></a> `fdatasync` | `public` | (`fd`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fdatasync`](../../../classes/Volume.md#property-fdatasync) |
| <a id="property-fdatasyncsync"></a> `fdatasyncSync` | `public` | (`fd`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fdatasyncSync`](../../../classes/Volume.md#property-fdatasyncsync) |
| <a id="property-fswatcher"></a> `FSWatcher` | `public` | () => `FSWatcher` | - | [`Volume`](../../../classes/Volume.md).[`FSWatcher`](../../../classes/Volume.md#property-fswatcher) | - |
| <a id="property-fsync"></a> `fsync` | `public` | (`fd`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fsync`](../../../classes/Volume.md#property-fsync) |
| <a id="property-fsyncsync"></a> `fsyncSync` | `public` | (`fd`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`fsyncSync`](../../../classes/Volume.md#property-fsyncsync) |
| <a id="property-ftruncate"></a> `ftruncate` | `public` | \{ (`fd`, `callback`): `any`; (`fd`, `len`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`ftruncate`](../../../classes/Volume.md#property-ftruncate) |
| <a id="property-ftruncatesync"></a> `ftruncateSync` | `public` | (`fd`, `len?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`ftruncateSync`](../../../classes/Volume.md#property-ftruncatesync) |
| <a id="property-futimes"></a> `futimes` | `public` | (`fd`, `atime`, `mtime`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`futimes`](../../../classes/Volume.md#property-futimes) |
| <a id="property-futimessync"></a> `futimesSync` | `public` | (`fd`, `atime`, `mtime`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`futimesSync`](../../../classes/Volume.md#property-futimessync) |
| <a id="property-glob"></a> `glob` | `public` | \{ (`pattern`, `callback`): `void`; (`pattern`, `options`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`glob`](../../../classes/Volume.md#property-glob) |
| <a id="property-globsync"></a> `globSync` | `public` | (`pattern`, `options?`) => `string`[] | - | - | [`Volume`](../../../classes/Volume.md).[`globSync`](../../../classes/Volume.md#property-globsync) |
| <a id="property-lchmod"></a> `lchmod` | `public` | (`path`, `mode`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lchmod`](../../../classes/Volume.md#property-lchmod) |
| <a id="property-lchmodsync"></a> `lchmodSync` | `public` | (`path`, `mode`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lchmodSync`](../../../classes/Volume.md#property-lchmodsync) |
| <a id="property-lchown"></a> `lchown` | `public` | (`path`, `uid`, `gid`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lchown`](../../../classes/Volume.md#property-lchown) |
| <a id="property-lchownsync"></a> `lchownSync` | `public` | (`path`, `uid`, `gid`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lchownSync`](../../../classes/Volume.md#property-lchownsync) |
| <a id="property-link"></a> `link` | `public` | (`existingPath`, `newPath`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`link`](../../../classes/Volume.md#property-link) |
| <a id="property-linksync"></a> `linkSync` | `public` | (`existingPath`, `newPath`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`linkSync`](../../../classes/Volume.md#property-linksync) |
| <a id="property-lstatsync"></a> `lstatSync` | `public` | \{ (`path`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`number`\>; (`path`, `options`): `Stats`\<`bigint`\>; (`path`, `options`): `Stats`\<`number`\> \| `undefined`; (`path`, `options`): `Stats`\<`number`\> \| `undefined`; (`path`, `options`): `Stats`\<`bigint`\> \| `undefined`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`lstatSync`](../../../classes/Volume.md#property-lstatsync) |
| <a id="property-lutimes"></a> `lutimes` | `public` | (`path`, `atime`, `mtime`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lutimes`](../../../classes/Volume.md#property-lutimes) |
| <a id="property-lutimessync"></a> `lutimesSync` | `public` | (`path`, `atime`, `mtime`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`lutimesSync`](../../../classes/Volume.md#property-lutimessync) |
| <a id="property-mkdir"></a> `mkdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; (`path`, `mode`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`mkdir`](../../../classes/Volume.md#property-mkdir) |
| <a id="property-mkdirsync"></a> `mkdirSync` | `public` | \{ (`path`, `options`): `string` \| `undefined`; (`path`, `options?`): `void`; (`path`, `options?`): `string` \| `undefined`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`mkdirSync`](../../../classes/Volume.md#property-mkdirsync) |
| <a id="property-mkdtemp"></a> `mkdtemp` | `public` | \{ (`prefix`, `callback`): `any`; (`prefix`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`mkdtemp`](../../../classes/Volume.md#property-mkdtemp) |
| <a id="property-mkdtempsync"></a> `mkdtempSync` | `public` | (`prefix`, `options?`) => `TDataOut` | - | - | [`Volume`](../../../classes/Volume.md).[`mkdtempSync`](../../../classes/Volume.md#property-mkdtempsync) |
| <a id="property-open"></a> `open` | `public` | \{ (`path`, `flags`, `callback`): `void`; (`path`, `flags`, `mode`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`open`](../../../classes/Volume.md#property-open) |
| <a id="property-openasblob"></a> `openAsBlob` | `public` | (`path`, `options?`) => `Promise`\<`Blob`\> | - | - | [`Volume`](../../../classes/Volume.md).[`openAsBlob`](../../../classes/Volume.md#property-openasblob) |
| <a id="property-opendir"></a> `opendir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`opendir`](../../../classes/Volume.md#property-opendir) |
| <a id="property-opendirsync"></a> `opendirSync` | `public` | (`path`, `options?`) => `Dir` | - | - | [`Volume`](../../../classes/Volume.md).[`opendirSync`](../../../classes/Volume.md#property-opendirsync) |
| <a id="property-opensync"></a> `openSync` | `public` | (`path`, `flags`, `mode?`) => `number` | - | - | [`Volume`](../../../classes/Volume.md).[`openSync`](../../../classes/Volume.md#property-opensync) |
| <a id="property-promises"></a> `promises` | `public` | `FsPromisesApi` | - | [`Volume`](../../../classes/Volume.md).[`promises`](../../../classes/Volume.md#promises) | - |
| <a id="property-read"></a> `read` | `public` | (`fd`, `buffer`, `offset`, `length`, `position`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`read`](../../../classes/Volume.md#property-read) |
| <a id="property-readdir"></a> `readdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`readdir`](../../../classes/Volume.md#property-readdir) |
| <a id="property-readdirsync"></a> `readdirSync` | `public` | (`path`, `options?`) => `TDataOut`[] \| `Dirent`[] | - | - | [`Volume`](../../../classes/Volume.md).[`readdirSync`](../../../classes/Volume.md#property-readdirsync) |
| <a id="property-readfile"></a> `readFile` | `public` | \{ (`id`, `callback`): `any`; (`id`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`readFile`](../../../classes/Volume.md#property-readfile) |
| <a id="property-readfilesync"></a> `readFileSync` | `public` | (`file`, `options?`) => `TDataOut` | - | - | [`Volume`](../../../classes/Volume.md).[`readFileSync`](../../../classes/Volume.md#property-readfilesync) |
| <a id="property-readlink"></a> `readlink` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`readlink`](../../../classes/Volume.md#property-readlink) |
| <a id="property-readlinksync"></a> `readlinkSync` | `public` | (`path`, `options?`) => `TDataOut` | - | - | [`Volume`](../../../classes/Volume.md).[`readlinkSync`](../../../classes/Volume.md#property-readlinksync) |
| <a id="property-readstream"></a> `ReadStream` | `public` | (...`args`) => `IReadStream` | - | [`Volume`](../../../classes/Volume.md).[`ReadStream`](../../../classes/Volume.md#property-readstream) | - |
| <a id="property-readsync"></a> `readSync` | `public` | (`fd`, `buffer`, `offset`, `length`, `position`) => `number` | - | - | [`Volume`](../../../classes/Volume.md).[`readSync`](../../../classes/Volume.md#property-readsync) |
| <a id="property-readv"></a> `readv` | `public` | \{ (`fd`, `buffers`, `callback`): `void`; (`fd`, `buffers`, `position`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`readv`](../../../classes/Volume.md#property-readv) |
| <a id="property-readvsync"></a> `readvSync` | `public` | (`fd`, `buffers`, `position?`) => `number` | - | - | [`Volume`](../../../classes/Volume.md).[`readvSync`](../../../classes/Volume.md#property-readvsync) |
| <a id="property-realpath"></a> `realpath` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; `native`: \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \}; \} | - | - | [`Volume`](../../../classes/Volume.md).[`realpath`](../../../classes/Volume.md#property-realpath) |
| `realpath.native` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \} | - | - | - |
| <a id="property-realpathsync"></a> `realpathSync` | `public` | \{ (`path`, `options?`): `TDataOut`; `native`: (`path`, `options?`) => `TDataOut`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`realpathSync`](../../../classes/Volume.md#property-realpathsync) |
| `realpathSync.native` | `public` | (`path`, `options?`) => `TDataOut` | - | - | - |
| <a id="property-rename"></a> `rename` | `public` | (`oldPath`, `newPath`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`rename`](../../../classes/Volume.md#property-rename) |
| <a id="property-renamesync"></a> `renameSync` | `public` | (`oldPath`, `newPath`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`renameSync`](../../../classes/Volume.md#property-renamesync) |
| <a id="property-rm"></a> `rm` | `public` | \{ (`path`, `callback`): `void`; (`path`, `options`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`rm`](../../../classes/Volume.md#property-rm) |
| <a id="property-rmdir"></a> `rmdir` | `public` | \{ (`path`, `callback`): `any`; (`path`, `options`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`rmdir`](../../../classes/Volume.md#property-rmdir) |
| <a id="property-rmdirsync"></a> `rmdirSync` | `public` | (`path`, `options?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`rmdirSync`](../../../classes/Volume.md#property-rmdirsync) |
| <a id="property-rmsync"></a> `rmSync` | `public` | (`path`, `options?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`rmSync`](../../../classes/Volume.md#property-rmsync) |
| <a id="property-stats"></a> `Stats` | `public` | (...`args`) => `Stats` | - | - | - |
| <a id="property-statwatcher"></a> `StatWatcher` | `public` | () => `StatWatcher` | - | [`Volume`](../../../classes/Volume.md).[`StatWatcher`](../../../classes/Volume.md#property-statwatcher) | - |
| <a id="property-symlink"></a> `symlink` | `public` | \{ (`target`, `path`, `callback`): `any`; (`target`, `path`, `type`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`symlink`](../../../classes/Volume.md#property-symlink) |
| <a id="property-symlinksync"></a> `symlinkSync` | `public` | (`target`, `path`, `type?`) => `void` | `type` argument works only on Windows. | - | [`Volume`](../../../classes/Volume.md).[`symlinkSync`](../../../classes/Volume.md#property-symlinksync) |
| <a id="property-truncate"></a> `truncate` | `public` | \{ (`id`, `callback`): `any`; (`id`, `len`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`truncate`](../../../classes/Volume.md#property-truncate) |
| <a id="property-truncatesync"></a> `truncateSync` | `public` | (`id`, `len?`) => `void` | `id` should be a file descriptor or a path. `id` as file descriptor will not be supported soon. | - | [`Volume`](../../../classes/Volume.md).[`truncateSync`](../../../classes/Volume.md#property-truncatesync) |
| <a id="property-unlink"></a> `unlink` | `public` | (`path`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`unlink`](../../../classes/Volume.md#property-unlink) |
| <a id="property-unlinksync"></a> `unlinkSync` | `public` | (`path`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`unlinkSync`](../../../classes/Volume.md#property-unlinksync) |
| <a id="property-utimes"></a> `utimes` | `public` | (`path`, `atime`, `mtime`, `callback`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`utimes`](../../../classes/Volume.md#property-utimes) |
| <a id="property-utimessync"></a> `utimesSync` | `public` | (`path`, `atime`, `mtime`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`utimesSync`](../../../classes/Volume.md#property-utimessync) |
| <a id="property-write"></a> `write` | `public` | \{ (`fd`, `buffer`, `callback`): `any`; (`fd`, `buffer`, `offset`, `callback`): `any`; (`fd`, `buffer`, `offset`, `length`, `callback`): `any`; (`fd`, `buffer`, `offset`, `length`, `position`, `callback`): `any`; (`fd`, `str`, `callback`): `any`; (`fd`, `str`, `position`, `callback`): `any`; (`fd`, `str`, `position`, `encoding`, `callback`): `any`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`write`](../../../classes/Volume.md#property-write) |
| <a id="property-writefile"></a> `writeFile` | `public` | \{ (`id`, `data`, `callback`): `void`; (`id`, `data`, `options`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`writeFile`](../../../classes/Volume.md#property-writefile) |
| <a id="property-writefilesync"></a> `writeFileSync` | `public` | (`id`, `data`, `options?`) => `void` | - | - | [`Volume`](../../../classes/Volume.md).[`writeFileSync`](../../../classes/Volume.md#property-writefilesync) |
| <a id="property-writestream"></a> `WriteStream` | `public` | (...`args`) => `IWriteStream` | - | [`Volume`](../../../classes/Volume.md).[`WriteStream`](../../../classes/Volume.md#property-writestream) | - |
| <a id="property-writesync"></a> `writeSync` | `public` | \{ (`fd`, `buffer`, `offset?`, `length?`, `position?`): `number`; (`fd`, `str`, `position?`, `encoding?`): `number`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`writeSync`](../../../classes/Volume.md#property-writesync) |
| <a id="property-writev"></a> `writev` | `public` | \{ (`fd`, `buffers`, `callback`): `void`; (`fd`, `buffers`, `position`, `callback`): `void`; \} | - | - | [`Volume`](../../../classes/Volume.md).[`writev`](../../../classes/Volume.md#property-writev) |
| <a id="property-writevsync"></a> `writevSync` | `public` | (`fd`, `buffers`, `position?`) => `number` | - | - | [`Volume`](../../../classes/Volume.md).[`writevSync`](../../../classes/Volume.md#property-writevsync) |
