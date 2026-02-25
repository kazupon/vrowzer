[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / readdir

# Variable: readdir()

```ts
const readdir: {
  (path, callback): any;
  (path, options, callback): any;
} = fs.readdir;
```

## Call Signature

```ts
(path, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`TDataOut`[] \| `Dirent`[]\> |

### Returns

`any`

## Call Signature

```ts
(
   path, 
   options, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `string` \| `IReaddirOptions` |
| `callback` | `TCallback`\<`TDataOut`[] \| `Dirent`[]\> |

### Returns

`any`
