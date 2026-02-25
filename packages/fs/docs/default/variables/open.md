[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / open

# Variable: open()

```ts
const open: {
  (path, flags, callback): void;
  (path, flags, mode, callback): void;
} = fs.open;
```

## Call Signature

```ts
(
   path, 
   flags, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `flags` | `TFlags` |
| `callback` | `TCallback`\<`number`\> |

### Returns

`void`

## Call Signature

```ts
(
   path, 
   flags, 
   mode, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `flags` | `TFlags` |
| `mode` | `TMode` |
| `callback` | `TCallback`\<`number`\> |

### Returns

`void`
