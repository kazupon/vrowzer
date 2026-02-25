[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / write

# Variable: write()

```ts
const write: {
  (fd, buffer, callback): any;
  (fd, buffer, offset, callback): any;
  (fd, buffer, offset, length, callback): any;
  (fd, buffer, offset, length, position, callback): any;
  (fd, str, callback): any;
  (fd, str, position, callback): any;
  (fd, str, position, encoding, callback): any;
} = fs.write;
```

## Call Signature

```ts
(
   fd, 
   buffer, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   buffer, 
   offset, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `offset` | `number` |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   buffer, 
   offset, 
   length, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `offset` | `number` |
| `length` | `number` |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   buffer, 
   offset, 
   length, 
   position, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `buffer` | \| `Buffer`\<`ArrayBufferLike`\> \| `ArrayBufferView`\<`ArrayBufferLike`\> \| `DataView`\<`ArrayBufferLike`\> |
| `offset` | `number` |
| `length` | `number` |
| `position` | `number` |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   str, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `str` | `string` |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   str, 
   position, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `str` | `string` |
| `position` | `number` |
| `callback` | (...`args`) => `void` |

### Returns

`any`

## Call Signature

```ts
(
   fd, 
   str, 
   position, 
   encoding, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `str` | `string` |
| `position` | `number` |
| `encoding` | `BufferEncoding` |
| `callback` | (...`args`) => `void` |

### Returns

`any`
