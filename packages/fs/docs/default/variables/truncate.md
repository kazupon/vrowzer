[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / truncate

# Variable: truncate()

```ts
const truncate: {
  (id, callback): any;
  (id, len, callback): any;
} = fs.truncate;
```

## Call Signature

```ts
(id, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   id, 
   len, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `len` | `number` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
