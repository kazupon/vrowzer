[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / ftruncate

# Variable: ftruncate()

```ts
const ftruncate: {
  (fd, callback): any;
  (fd, len, callback): any;
} = fs.ftruncate;
```

## Call Signature

```ts
(fd, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   len, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `len` | `number` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
