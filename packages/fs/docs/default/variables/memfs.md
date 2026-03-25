[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / memfs

# Variable: memfs()

```ts
const memfs: (json?, cwd?) => object;
```

Creates a new file system instance.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `json?` | [`NestedDirectoryJSON`](../namespaces/memfsExported/interfaces/NestedDirectoryJSON.md) | File system structure expressed as a JSON object. Use `null` for empty directories and empty string for empty files. |
| `cwd?` | `string` | Current working directory. The JSON structure will be created relative to this path. |

## Returns

`object`

A `memfs` file system instance, which is a drop-in replacement for
         the `fs` module.

### fs

```ts
fs: IFs;
```

### vol

```ts
vol: Volume;
```
