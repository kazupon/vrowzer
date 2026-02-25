[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / read

# Variable: read()

```ts
const read: (fd, buffer, offset, length, position, callback) => void = fs.read;
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `offset` | `number` |
| `length` | `number` |
| `position` | `number` \| `null` |
| `callback` | (`err?`, `bytesRead?`, `buffer?`) => `void` |

## Returns

`void`
