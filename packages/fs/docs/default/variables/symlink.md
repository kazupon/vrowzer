[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / symlink

# Variable: symlink()

```ts
const symlink: {
  (target, path, callback): any;
  (target, path, type, callback): any;
} = fs.symlink;
```

## Call Signature

```ts
(
   target, 
   path, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `PathLike` |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   target, 
   path, 
   type, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `PathLike` |
| `path` | `PathLike` |
| `type` | `Type` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
