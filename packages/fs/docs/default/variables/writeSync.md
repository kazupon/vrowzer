[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / writeSync

# Variable: writeSync()

```ts
const writeSync: {
  (fd, buffer, offset?, length?, position?): number;
  (fd, str, position?, encoding?): number;
} = fs.writeSync;
```

## Call Signature

```ts
(
   fd, 
   buffer, 
   offset?, 
   length?, 
   position?): number;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `offset?` | `number` |
| `length?` | `number` |
| `position?` | `number` \| `null` |

### Returns

`number`

## Call Signature

```ts
(
   fd, 
   str, 
   position?, 
   encoding?): number;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `str` | `string` |
| `position?` | `number` |
| `encoding?` | `BufferEncoding` |

### Returns

`number`
