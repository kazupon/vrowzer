[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / access

# Variable: access()

```ts
const access: {
  (path, callback): any;
  (path, mode, callback): any;
} = fs.access;
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
| `mode` | `number` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
