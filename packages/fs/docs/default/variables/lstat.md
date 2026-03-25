[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / lstat

# Variable: lstat()

```ts
const lstat: {
  (path, callback): void;
  (path, options, callback): void;
} = fs.lstat;
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
