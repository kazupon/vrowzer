[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / rm

# Variable: rm()

```ts
const rm: {
  (path, callback): void;
  (path, options, callback): void;
} = fs.rm;
```

## Call Signature

```ts
(path, callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`void`\> |

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
| `options` | `IRmOptions` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`void`
