[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / mkdir

# Variable: mkdir()

```ts
const mkdir: {
  (path, callback): any;
  (path, mode, callback): any;
  (path, mode, callback): any;
  (path, mode, callback): any;
} = fs.mkdir;
```

## Call Signature

```ts
(path, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   path, 
   mode, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `mode` | `TMode` \| `IMkdirOptions` & `object` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   path, 
   mode, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `mode` | `IMkdirOptions` & `object` |
| `callback` | `TCallback`\<`string`\> |

### Returns

`any`

## Call Signature

```ts
(
   path, 
   mode, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `mode` | `IMkdirOptions` \| `TMode` |
| `callback` | `TCallback`\<`string`\> |

### Returns

`any`
