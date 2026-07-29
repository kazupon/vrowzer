# Class: Volume

`Volume` represents a file system.

## Implements

- `FsCallbackApi`
- `FsSynchronousApi`

## Signature

```ts
export declare class Volume implements FsCallbackApi, FsSynchronousApi
```

## Constructors

### Constructor

```ts
new Volume(_core?: Superblock): Volume;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `_core` | `Superblock` | _optional_ |

#### Returns

[`Volume`](/packages/fs/docs/default/classes/Volume.md)

## Methods

### createReadStream()

```ts
createReadStream(path: misc.PathLike, options?: opts.IReadStreamOptions | string): misc.IReadStream;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `misc.PathLike` |  |
| `options` | `opts.IReadStreamOptions \| string` | _optional_ |

#### Returns

`misc.IReadStream`

***

### createWriteStream()

```ts
createWriteStream(path: PathLike, options?: opts.IWriteStreamOptions | string): IWriteStream;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IWriteStreamOptions \| string` | _optional_ |

#### Returns

`IWriteStream`

***

### fromBinarySnapshot()

```ts
fromBinarySnapshot(binary: Uint8Array, path?: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `binary` | `Uint8Array` |  |
| `path` | `string` | _optional_ |

#### Returns

`void`

***

### fromJSON()

```ts
fromJSON(json: DirectoryJSON, cwd?: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `json` | [`DirectoryJSON`](/packages/fs/docs/default/interfaces/DirectoryJSON.md) |  |
| `cwd` | `string` | _optional_ |

#### Returns

`void`

***

### fromJsonSnapshot()

```ts
fromJsonSnapshot(json: string, path?: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `json` | `string` |  |
| `path` | `string` | _optional_ |

#### Returns

`void`

***

### fromNestedJSON()

```ts
fromNestedJSON(json: NestedDirectoryJSON, cwd?: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `json` | `NestedDirectoryJSON` |  |
| `cwd` | `string` | _optional_ |

#### Returns

`void`

***

### fromSnapshot()

```ts
fromSnapshot(snapshot: fsSnapshot.SnapshotNode, path?: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `snapshot` | `fsSnapshot.SnapshotNode` |  |
| `path` | `string` | _optional_ |

#### Returns

`void`

***

### fstat()

```ts
fstat(fd: number, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### fstat()

```ts
fstat(fd: number, options: opts.IFStatOptions, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `options` | `opts.IFStatOptions` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### fstatSync()

```ts
fstatSync(fd: number): Stats<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>

***

### fstatSync()

```ts
fstatSync(fd: number, options: {
        bigint: false;
    }): Stats<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `options` | `{ bigint: false }` |  |
| `options.bigint` | `false` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>

***

### fstatSync()

```ts
fstatSync(fd: number, options: {
        bigint: true;
    }): Stats<bigint>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `options` | `{ bigint: true }` |  |
| `options.bigint` | `true` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`bigint`\>

***

### lstat()

```ts
lstat(path: PathLike, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### lstat()

```ts
lstat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IStatOptions` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### mountSync()

```ts
mountSync(mountpoint: string, json: DirectoryJSON): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `mountpoint` | `string` |  |
| `json` | [`DirectoryJSON`](/packages/fs/docs/default/interfaces/DirectoryJSON.md) |  |

#### Returns

`void`

***

### promises

```ts
promises(): FsPromisesApi;
```

#### Returns

`FsPromisesApi`

***

### reset()

```ts
reset(): void;
```

#### Returns

`void`

***

### stat()

```ts
stat(path: PathLike, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### stat()

```ts
stat(path: PathLike, options: opts.IStatOptions, callback: misc.TCallback<Stats>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IStatOptions` |  |
| `callback` | `misc`.`TCallback`\<[`Stats`](/packages/fs/docs/default/variables/Stats.md)\> |  |

#### Returns

`void`

***

### statfs()

```ts
statfs(path: PathLike, callback: misc.TCallback<StatFs>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `callback` | `misc.TCallback<StatFs>` |  |

#### Returns

`void`

***

### statfs()

```ts
statfs(path: PathLike, options: opts.IStafsOptions, callback: misc.TCallback<StatFs>): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IStafsOptions` |  |
| `callback` | `misc.TCallback<StatFs>` |  |

#### Returns

`void`

***

### statfsSync()

```ts
statfsSync(path: PathLike): StatFs<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |

#### Returns

`StatFs<number>`

***

### statfsSync()

```ts
statfsSync(path: PathLike, options: {
        bigint: false;
    }): StatFs<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: false }` |  |
| `options.bigint` | `false` |  |

#### Returns

`StatFs<number>`

***

### statfsSync()

```ts
statfsSync(path: PathLike, options: {
        bigint: true;
    }): StatFs<bigint>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: true }` |  |
| `options.bigint` | `true` |  |

#### Returns

`StatFs<bigint>`

***

### statSync()

```ts
statSync(path: PathLike): Stats<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>

***

### statSync()

```ts
statSync(path: PathLike, options: {
        throwIfNoEntry?: true;
    }): Stats<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ throwIfNoEntry?: true }` |  |
| `options.throwIfNoEntry?` | `true` | _optional_ |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>

***

### statSync()

```ts
statSync(path: PathLike, options: {
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ throwIfNoEntry: false }` |  |
| `options.throwIfNoEntry` | `false` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\> | `undefined`

***

### statSync()

```ts
statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry?: true;
    }): Stats<number>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: false; throwIfNoEntry?: true }` |  |
| `options.bigint` | `false` |  |
| `options.throwIfNoEntry?` | `true` | _optional_ |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>

***

### statSync()

```ts
statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry?: true;
    }): Stats<bigint>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: true; throwIfNoEntry?: true }` |  |
| `options.bigint` | `true` |  |
| `options.throwIfNoEntry?` | `true` | _optional_ |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`bigint`\>

***

### statSync()

```ts
statSync(path: PathLike, options: {
        bigint: false;
        throwIfNoEntry: false;
    }): Stats<number> | undefined;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: false; throwIfNoEntry: false }` |  |
| `options.bigint` | `false` |  |
| `options.throwIfNoEntry` | `false` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\> | `undefined`

***

### statSync()

```ts
statSync(path: PathLike, options: {
        bigint: true;
        throwIfNoEntry: false;
    }): Stats<bigint> | undefined;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `{ bigint: true; throwIfNoEntry: false }` |  |
| `options.bigint` | `true` |  |
| `options.throwIfNoEntry` | `false` |  |

#### Returns

[`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`bigint`\> | `undefined`

***

### toBinarySnapshot()

```ts
toBinarySnapshot(path?: string): Uint8Array;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | _optional_ |

#### Returns

`Uint8Array`

***

### toJSON()

```ts
toJSON(paths?: PathLike | PathLike[], json?: {}, isRelative?: boolean, asBuffer?: boolean): DirectoryJSON<string | null>;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `paths` | `PathLike \| PathLike[]` | _optional_ |
| `json` | `{}` | _optional_ |
| `isRelative` | `boolean` | _optional_ |
| `asBuffer` | `boolean` | _optional_ |

#### Returns

[`DirectoryJSON`](/packages/fs/docs/default/interfaces/DirectoryJSON.md)\<`string` | `null`\>

***

### toJsonSnapshot()

```ts
toJsonSnapshot(path?: string): string;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | _optional_ |

#### Returns

`string`

***

### toSnapshot()

```ts
toSnapshot(path?: string): fsSnapshot.SnapshotNode;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` | _optional_ |

#### Returns

`fsSnapshot.SnapshotNode`

***

### toTree()

```ts
toTree(opts?: ToTreeOptions): string;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `opts` | `ToTreeOptions` | _optional_ |

#### Returns

`string`

***

### unwatchFile()

```ts
unwatchFile(path: PathLike, listener?: (curr: Stats, prev: Stats) => void): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `listener` | (`curr`: [`Stats`](/packages/fs/docs/default/variables/Stats.md), `prev`: [`Stats`](/packages/fs/docs/default/variables/Stats.md)) =\> `void` | _optional_ |

#### Returns

`void`

***

### watch()

```ts
watch(path: PathLike, options?: IWatchOptions | string, listener?: (eventType: string, filename: string) => void): FSWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `IWatchOptions \| string` | _optional_ |
| `listener` | `(eventType: string, filename: string) => void` | _optional_ |

#### Returns

[`FSWatcher`](/packages/fs/docs/default/variables/FSWatcher.md)

***

### watchFile()

```ts
watchFile(path: PathLike, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `listener` | (`curr`: [`Stats`](/packages/fs/docs/default/variables/Stats.md), `prev`: [`Stats`](/packages/fs/docs/default/variables/Stats.md)) =\> `void` |  |

#### Returns

[`StatWatcher`](/packages/fs/docs/default/variables/StatWatcher.md)

***

### watchFile()

```ts
watchFile(path: PathLike, options: IWatchFileOptions, listener: (curr: Stats, prev: Stats) => void): StatWatcher;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `IWatchFileOptions` |  |
| `listener` | (`curr`: [`Stats`](/packages/fs/docs/default/variables/Stats.md), `prev`: [`Stats`](/packages/fs/docs/default/variables/Stats.md)) =\> `void` |  |

#### Returns

[`StatWatcher`](/packages/fs/docs/default/variables/StatWatcher.md)

## Static Properties

| Name | Type | Description |
| --- | --- | --- |
| `fromJSON` _(readonly, static)_ | (`json`: [`DirectoryJSON`](/packages/fs/docs/default/interfaces/DirectoryJSON.md), `cwd`?: `string`) =\> [`Volume`](/packages/fs/docs/default/classes/Volume.md) |  |
| `fromNestedJSON` _(readonly, static)_ | (`json`: `NestedDirectoryJSON`, `cwd`?: `string`) =\> [`Volume`](/packages/fs/docs/default/classes/Volume.md) |  |

### fromJSON Parameters

| Name | Type | Description |
| --- | --- | --- |
| `json` | [`DirectoryJSON`](/packages/fs/docs/default/interfaces/DirectoryJSON.md) |  |
| `cwd` | `string` | _optional_ |

### fromJSON Returns

[`Volume`](/packages/fs/docs/default/classes/Volume.md)

### fromNestedJSON Parameters

| Name | Type | Description |
| --- | --- | --- |
| `json` | `NestedDirectoryJSON` |  |
| `cwd` | `string` | _optional_ |

### fromNestedJSON Returns

[`Volume`](/packages/fs/docs/default/classes/Volume.md)

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `_core` _(readonly)_ | `Superblock` |  |
| `access` | `{ (path: PathLike, callback: misc.TCallback<void>): any;; (path: PathLike, mode: number, callback: misc.TCallback<void>): any; }` |  |
| `accessSync` | `(path: PathLike, mode?: number) => void` |  |
| `appendFile` | `{ (id: TFileId, data: TData, callback: misc.TCallback<void>): any;; (id: TFileId, data: TData, options: IAppendFileOptions \| string, callback: misc.TCallback<void>): any; }` |  |
| `appendFileSync` | `(id: TFileId, data: TData, options?: IAppendFileOptions \| string) => void` |  |
| `chmod` | `(path: PathLike, mode: TMode, callback: misc.TCallback<void>) => void` |  |
| `chmodSync` | `(path: PathLike, mode: TMode) => void` |  |
| `chown` | `(path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => void` |  |
| `chownSync` | `(path: PathLike, uid: number, gid: number) => void` |  |
| `close` | `(fd: number, callback: misc.TCallback<void>) => void` |  |
| `closeSync` | `(fd: number) => void` |  |
| `copyFile` | `{ (src: PathLike, dest: PathLike, callback: misc.TCallback<void>): any;; (src: PathLike, dest: PathLike, flags: TFlagsCopy, callback: misc.TCallback<void>): any; }` |  |
| `copyFileSync` | `(src: PathLike, dest: PathLike, flags?: TFlagsCopy) => void` |  |
| `cp` | `{ (src: string \| URL, dest: string \| URL, callback: misc.TCallback<void>): any;; (src: string \| URL, dest: string \| URL, options: opts.ICpOptions, callback: misc.TCallback<void>): any; }` |  |
| `cpSync` | `(src: string \| URL, dest: string \| URL, options?: opts.ICpOptions) => void` |  |
| `exists` | (`path`: `PathLike`, `callback`: ([`exists`](/packages/fs/docs/default/variables/exists.md): `boolean`) =\> `void`) =\> `void` |  |
| `existsSync` | `(path: PathLike) => boolean` |  |
| `fchmod` | `(fd: number, mode: TMode, callback: misc.TCallback<void>) => void` |  |
| `fchmodSync` | `(fd: number, mode: TMode) => void` |  |
| `fchown` | `(fd: number, uid: number, gid: number, callback: misc.TCallback<void>) => void` |  |
| `fchownSync` | `(fd: number, uid: number, gid: number) => void` |  |
| `fdatasync` | `(fd: number, callback: misc.TCallback<void>) => void` |  |
| `fdatasyncSync` | `(fd: number) => void` |  |
| `FSWatcher` | `new` () =\> [`FSWatcher`](/packages/fs/docs/default/variables/FSWatcher.md) |  |
| `fsync` | `(fd: number, callback: misc.TCallback<void>) => void` |  |
| `fsyncSync` | `(fd: number) => void` |  |
| `ftruncate` | `{ (fd: number, callback: misc.TCallback<void>): any;; (fd: number, len: number, callback: misc.TCallback<void>): any; }` |  |
| `ftruncateSync` | `(fd: number, len?: number) => void` |  |
| `futimes` | `(fd: number, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void` |  |
| `futimesSync` | `(fd: number, atime: TTime, mtime: TTime) => void` |  |
| `glob` | `FsCallbackApi['glob']` |  |
| `globSync` | `FsSynchronousApi['globSync']` |  |
| `lchmod` | `(path: PathLike, mode: TMode, callback: misc.TCallback<void>) => void` |  |
| `lchmodSync` | `(path: PathLike, mode: TMode) => void` |  |
| `lchown` | `(path: PathLike, uid: number, gid: number, callback: misc.TCallback<void>) => void` |  |
| `lchownSync` | `(path: PathLike, uid: number, gid: number) => void` |  |
| `link` | `(existingPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => void` |  |
| `linkSync` | `(existingPath: PathLike, newPath: PathLike) => void` |  |
| `lstatSync` | { (`path`: `PathLike`): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>;; (`path`: `PathLike`, `options`: { `throwIfNoEntry`?: `true` \| `undefined`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>;; (`path`: `PathLike`, `options`: { `bigint`: `false`; `throwIfNoEntry`?: `true` \| `undefined`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\>;; (`path`: `PathLike`, `options`: { `bigint`: `true`; `throwIfNoEntry`?: `true` \| `undefined`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`bigint`\>;; (`path`: `PathLike`, `options`: { `throwIfNoEntry`: `false`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\> \| `undefined`;; (`path`: `PathLike`, `options`: { `bigint`: `false`; `throwIfNoEntry`: `false`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`number`\> \| `undefined`;; (`path`: `PathLike`, `options`: { `bigint`: `true`; `throwIfNoEntry`: `false`; }): [`Stats`](/packages/fs/docs/default/variables/Stats.md)\<`bigint`\> \| `undefined`; } |  |
| `lutimes` | `(path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void` |  |
| `lutimesSync` | `(path: PathLike, atime: TTime, mtime: TTime) => void` |  |
| `mkdir` | `{ (path: PathLike, callback: misc.TCallback<void>): any;; (path: PathLike, mode: TMode \| (opts.IMkdirOptions & { recursive?: false; }), callback: misc.TCallback<void>): any;; (path: PathLike, mode: opts.IMkdirOptions & { recursive: true; }, callback: misc.TCallback<string>): any;; (path: PathLike, mode: TMode \| opts.IMkdirOptions, callback: misc.TCallback<string>): any; }` |  |
| `mkdirSync` | `{ (path: PathLike, options: opts.IMkdirOptions & { recursive: true; }): string \| undefined;; (path: PathLike, options?: TMode \| (opts.IMkdirOptions & { recursive?: false; })): void;; (path: PathLike, options?: TMode \| opts.IMkdirOptions): string \| undefined; }` |  |
| `mkdtemp` | `{ (prefix: string, callback: misc.TCallback<string>): any;; (prefix: string, options: opts.IOptions, callback: misc.TCallback<string>): any; }` |  |
| `mkdtempSync` | `(prefix: string, options?: opts.IOptions) => TDataOut` |  |
| `open` | `{ (path: PathLike, flags: TFlags, /* ... */ callback: misc.TCallback<number>): void;; (path: PathLike, flags: TFlags, mode: TMode, callback: misc.TCallback<number>): void; }` |  |
| `openAsBlob` | `(path: PathLike, options?: opts.IOpenAsBlobOptions) => Promise<Blob>` |  |
| `opendir` | `{ (path: PathLike, callback: misc.TCallback<Dir>): any;; (path: PathLike, options: opts.IOpendirOptions \| string, callback: misc.TCallback<Dir>): any; }` |  |
| `opendirSync` | `(path: PathLike, options?: opts.IOpendirOptions \| string) => Dir` |  |
| `openSync` | `(path: PathLike, flags: TFlags, mode?: TMode) => number` |  |
| `read` | `(fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset: number, length: number, position: number \| null, callback: (err?: Error \| null, bytesRead?: number, buffer?: Buffer \| ArrayBufferView \| DataView) => void) => void` |  |
| `readdir` | { (`path`: `PathLike`, `callback`: `misc`.`TCallback`\<`TDataOut`\[\] \| [`Dirent`](/packages/fs/docs/default/variables/Dirent.md)\[\]\>): `any`;; (`path`: `PathLike`, `options`: `opts`.`IReaddirOptions` \| `string`, `callback`: `misc`.`TCallback`\<`TDataOut`\[\] \| [`Dirent`](/packages/fs/docs/default/variables/Dirent.md)\[\]\>): `any`; } |  |
| `readdirSync` | (`path`: `PathLike`, `options`?: `opts`.`IReaddirOptions` \| `string`) =\> `TDataOut`\[\] \| [`Dirent`](/packages/fs/docs/default/variables/Dirent.md)\[\] |  |
| `readFile` | `{ (id: TFileId, callback: misc.TCallback<TDataOut>): any;; (id: TFileId, options: opts.IReadFileOptions \| string, callback: misc.TCallback<TDataOut>): any; }` |  |
| `readFileSync` | `(file: TFileId, options?: opts.IReadFileOptions \| string) => TDataOut` |  |
| `readlink` | `{ (path: PathLike, callback: misc.TCallback<TDataOut>): any;; (path: PathLike, options: opts.IOptions, callback: misc.TCallback<TDataOut>): any; }` |  |
| `readlinkSync` | `(path: PathLike, options?: opts.IOptions) => TDataOut` |  |
| `ReadStream` | `new (...args: any[]) => misc.IReadStream` |  |
| `readSync` | `(fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset: number, length: number, position: number \| null) => number` |  |
| `readv` | `{ (fd: number, buffers: ArrayBufferView[], callback: misc.TCallback2<number, ArrayBufferView[]>): void;; (fd: number, buffers: ArrayBufferView[], position: number \| null, callback: misc.TCallback2<number, ArrayBufferView[]>): void; }` |  |
| `readvSync` | `(fd: number, buffers: ArrayBufferView[], position?: number \| null) => number` |  |
| `realpath` | `{ (path: PathLike, callback: misc.TCallback<TDataOut>): void;; (path: PathLike, options: opts.IRealpathOptions \| string, callback: misc.TCallback<TDataOut>): void;; native: { (path: PathLike, callback: misc.TCallback<TDataOut>): void;; (path: PathLike, options: opts.IRealpathOptions \| string, callback: misc.TCallback<TDataOut>): void; } }` |  |
| `realpathSync` | `{ (path: PathLike, options?: opts.IRealpathOptions \| string): TDataOut;; native: (path: PathLike, options?: opts.IRealpathOptions \| string) => TDataOut }` |  |
| `rename` | `(oldPath: PathLike, newPath: PathLike, callback: misc.TCallback<void>) => void` |  |
| `renameSync` | `(oldPath: PathLike, newPath: PathLike) => void` |  |
| `rm` | `{ (path: PathLike, callback: misc.TCallback<void>): void;; (path: PathLike, options: opts.IRmOptions, callback: misc.TCallback<void>): void; }` |  |
| `rmdir` | `{ (path: PathLike, callback: misc.TCallback<void>): any;; (path: PathLike, options: opts.IRmdirOptions, callback: misc.TCallback<void>): any; }` |  |
| `rmdirSync` | `(path: PathLike, options?: opts.IRmdirOptions) => void` |  |
| `rmSync` | `(path: PathLike, options?: opts.IRmOptions) => void` |  |
| `StatWatcher` | `new` () =\> [`StatWatcher`](/packages/fs/docs/default/variables/StatWatcher.md) |  |
| `symlink` | { (`target`: `PathLike`, `path`: `PathLike`, `callback`: `misc`.`TCallback`\<`void`\>): `any`;; (`target`: `PathLike`, `path`: `PathLike`, `type`: [`symlink`](/packages/fs/docs/default/variables/symlink.md).`Type`, `callback`: `misc`.`TCallback`\<`void`\>): `any`; } |  |
| `symlinkSync` | (`target`: `PathLike`, `path`: `PathLike`, `type`?: [`symlink`](/packages/fs/docs/default/variables/symlink.md).`Type`) =\> `void` | `type` argument works only on Windows. |
| `truncate` | `{ (id: TFileId, callback: misc.TCallback<void>): any;; (id: TFileId, len: number, callback: misc.TCallback<void>): any; }` |  |
| `truncateSync` | `(id: TFileId, len?: number) => void` | `id` should be a file descriptor or a path. `id` as file descriptor will not be supported soon. |
| `unlink` | `(path: PathLike, callback: misc.TCallback<void>) => void` |  |
| `unlinkSync` | `(path: PathLike) => void` |  |
| `utimes` | `(path: PathLike, atime: TTime, mtime: TTime, callback: misc.TCallback<void>) => void` |  |
| `utimesSync` | `(path: PathLike, atime: TTime, mtime: TTime) => void` |  |
| `write` | `{ (fd: number, buffer: Buffer \| ArrayBufferView \| DataView, callback: (...args: any[]) => void): any;; (fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset: number, callback: (...args: any[]) => void): any;; (fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset: number, length: number, callback: (...args: any[]) => void): any;; (fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset: number, length: number, position: number, callback: (...args: any[]) => void): any;; (fd: number, str: string, callback: (...args: any[]) => void): any;; (fd: number, str: string, position: number, callback: (...args: any[]) => void): any;; (fd: number, str: string, position: number, encoding: BufferEncoding, callback: (...args: any[]) => void): any; }` |  |
| `writeFile` | `{ (id: TFileId, data: TData, callback: misc.TCallback<void>): void;; (id: TFileId, data: TData, options: opts.IWriteFileOptions \| string, callback: misc.TCallback<void>): void; }` |  |
| `writeFileSync` | `(id: TFileId, data: TData, options?: opts.IWriteFileOptions) => void` |  |
| `WriteStream` | `new (...args: any[]) => IWriteStream` |  |
| `writeSync` | `{ (fd: number, buffer: Buffer \| ArrayBufferView \| DataView, offset?: number, length?: number, position?: number \| null): number;; (fd: number, str: string, position?: number, encoding?: BufferEncoding): number; }` |  |
| `writev` | `{ (fd: number, buffers: ArrayBufferView[], callback: WritevCallback): void;; (fd: number, buffers: ArrayBufferView[], position: number \| null, callback: WritevCallback): void; }` |  |
| `writevSync` | `(fd: number, buffers: ArrayBufferView[], position?: number \| null) => number` |  |

### accessSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `mode` | `number` | _optional_ |

### accessSync Returns

`void`

### appendFileSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `TFileId` |  |
| `data` | `TData` |  |
| `options` | `IAppendFileOptions \| string` | _optional_ |

### appendFileSync Returns

`void`

### chmod Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `mode` | `TMode` |  |
| `callback` | `misc.TCallback<void>` |  |

### chmod Returns

`void`

### chmodSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `mode` | `TMode` |  |

### chmodSync Returns

`void`

### chown Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### chown Returns

`void`

### chownSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |

### chownSync Returns

`void`

### close Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### close Returns

`void`

### closeSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |

### closeSync Returns

`void`

### copyFileSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `src` | `PathLike` |  |
| `dest` | `PathLike` |  |
| `flags` | `TFlagsCopy` | _optional_ |

### copyFileSync Returns

`void`

### cpSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `src` | `string \| URL` |  |
| `dest` | `string \| URL` |  |
| `options` | `opts.ICpOptions` | _optional_ |

### cpSync Returns

`void`

### exists Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `callback` | ([`exists`](/packages/fs/docs/default/variables/exists.md): `boolean`) =\> `void` |  |

### exists Returns

`void`

### existsSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |

### existsSync Returns

`boolean`

### fchmod Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `mode` | `TMode` |  |
| `callback` | `misc.TCallback<void>` |  |

### fchmod Returns

`void`

### fchmodSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `mode` | `TMode` |  |

### fchmodSync Returns

`void`

### fchown Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### fchown Returns

`void`

### fchownSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |

### fchownSync Returns

`void`

### fdatasync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### fdatasync Returns

`void`

### fdatasyncSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |

### fdatasyncSync Returns

`void`

### fsync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### fsync Returns

`void`

### fsyncSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |

### fsyncSync Returns

`void`

### ftruncateSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `len` | `number` | _optional_ |

### ftruncateSync Returns

`void`

### futimes Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |
| `callback` | `misc.TCallback<void>` |  |

### futimes Returns

`void`

### futimesSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |

### futimesSync Returns

`void`

### lchmod Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `mode` | `TMode` |  |
| `callback` | `misc.TCallback<void>` |  |

### lchmod Returns

`void`

### lchmodSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `mode` | `TMode` |  |

### lchmodSync Returns

`void`

### lchown Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |
| `callback` | `misc.TCallback<void>` |  |

### lchown Returns

`void`

### lchownSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `uid` | `number` |  |
| `gid` | `number` |  |

### lchownSync Returns

`void`

### link Parameters

| Name | Type | Description |
| --- | --- | --- |
| `existingPath` | `PathLike` |  |
| `newPath` | `PathLike` |  |
| `callback` | `misc.TCallback<void>` |  |

### link Returns

`void`

### linkSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `existingPath` | `PathLike` |  |
| `newPath` | `PathLike` |  |

### linkSync Returns

`void`

### lutimes Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |
| `callback` | `misc.TCallback<void>` |  |

### lutimes Returns

`void`

### lutimesSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |

### lutimesSync Returns

`void`

### mkdtempSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `prefix` | `string` |  |
| `options` | `opts.IOptions` | _optional_ |

### mkdtempSync Returns

`TDataOut`

### openAsBlob Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IOpenAsBlobOptions` | _optional_ |

### openAsBlob Returns

`Promise<Blob>`

### opendirSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IOpendirOptions \| string` | _optional_ |

### opendirSync Returns

`Dir`

### openSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `flags` | `TFlags` |  |
| `mode` | `TMode` | _optional_ |

### openSync Returns

`number`

### read Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `buffer` | `Buffer \| ArrayBufferView \| DataView` |  |
| `offset` | `number` |  |
| `length` | `number` |  |
| `position` | `number \| null` |  |
| `callback` | `(err?: Error \| null, bytesRead?: number, buffer?: Buffer \| ArrayBufferView \| DataView) => void` |  |

### read Returns

`void`

### readdirSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IReaddirOptions \| string` | _optional_ |

### readdirSync Returns

`TDataOut`\[\] | [`Dirent`](/packages/fs/docs/default/variables/Dirent.md)\[\]

### readFileSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `file` | `TFileId` |  |
| `options` | `opts.IReadFileOptions \| string` | _optional_ |

### readFileSync Returns

`TDataOut`

### readlinkSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IOptions` | _optional_ |

### readlinkSync Returns

`TDataOut`

### readSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `buffer` | `Buffer \| ArrayBufferView \| DataView` |  |
| `offset` | `number` |  |
| `length` | `number` |  |
| `position` | `number \| null` |  |

### readSync Returns

`number`

### readvSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `buffers` | `ArrayBufferView[]` |  |
| `position` | `number \| null` | _optional_ |

### readvSync Returns

`number`

### rename Parameters

| Name | Type | Description |
| --- | --- | --- |
| `oldPath` | `PathLike` |  |
| `newPath` | `PathLike` |  |
| `callback` | `misc.TCallback<void>` |  |

### rename Returns

`void`

### renameSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `oldPath` | `PathLike` |  |
| `newPath` | `PathLike` |  |

### renameSync Returns

`void`

### rmdirSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IRmdirOptions` | _optional_ |

### rmdirSync Returns

`void`

### rmSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `options` | `opts.IRmOptions` | _optional_ |

### rmSync Returns

`void`

### symlinkSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | `PathLike` |  |
| `path` | `PathLike` |  |
| `type` | [`symlink`](/packages/fs/docs/default/variables/symlink.md).`Type` | _optional_ |

### symlinkSync Returns

`void`

### truncateSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `TFileId` |  |
| `len` | `number` | _optional_ |

### truncateSync Returns

`void`

### unlink Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `callback` | `misc.TCallback<void>` |  |

### unlink Returns

`void`

### unlinkSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |

### unlinkSync Returns

`void`

### utimes Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |
| `callback` | `misc.TCallback<void>` |  |

### utimes Returns

`void`

### utimesSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `PathLike` |  |
| `atime` | `TTime` |  |
| `mtime` | `TTime` |  |

### utimesSync Returns

`void`

### writeFileSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `TFileId` |  |
| `data` | `TData` |  |
| `options` | `opts.IWriteFileOptions` | _optional_ |

### writeFileSync Returns

`void`

### writevSync Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fd` | `number` |  |
| `buffers` | `ArrayBufferView[]` |  |
| `position` | `number \| null` | _optional_ |

### writevSync Returns

`number`
