[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / copyFile

# Variable: copyFile()

```ts
const copyFile: {
  (src, dest, callback): any;
  (src, dest, flags, callback): any;
} = fs.copyFile;
```

## Call Signature

```ts
(
   src, 
   dest, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `src` | `PathLike` |
| `dest` | `PathLike` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   src, 
   dest, 
   flags, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `src` | `PathLike` |
| `dest` | `PathLike` |
| `flags` | `number` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
