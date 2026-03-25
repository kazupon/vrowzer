[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / readlink

# Variable: readlink()

```ts
const readlink: {
  (path, callback): any;
  (path, options, callback): any;
} = fs.readlink;
```

## Call Signature

```ts
(path, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`TDataOut`\> |

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
| `options` | `IOptions` |
| `callback` | `TCallback`\<`TDataOut`\> |

### Returns

`any`
