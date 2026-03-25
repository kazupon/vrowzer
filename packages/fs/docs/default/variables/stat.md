[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / stat

# Variable: stat()

```ts
const stat: {
  (path, callback): void;
  (path, options, callback): void;
} = fs.stat;
```

## Call Signature

```ts
(path, callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

### Returns

`void`

## Call Signature

```ts
(
   path, 
   options, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IStatOptions` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

### Returns

`void`
