[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / fstat

# Variable: fstat()

```ts
const fstat: {
  (fd, callback): void;
  (fd, options, callback): void;
} = fs.fstat;
```

## Call Signature

```ts
(fd, callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

### Returns

`void`

## Call Signature

```ts
(
   fd, 
   options, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | `IFStatOptions` |
| `callback` | `TCallback`\<`Stats`\<`TStatNumber`\>\> |

### Returns

`void`
