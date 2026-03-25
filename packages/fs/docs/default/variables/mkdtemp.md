[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / mkdtemp

# Variable: mkdtemp()

```ts
const mkdtemp: {
  (prefix, callback): any;
  (prefix, options, callback): any;
} = fs.mkdtemp;
```

## Call Signature

```ts
(prefix, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `prefix` | `string` |
| `callback` | `TCallback`\<`string`\> |

### Returns

`any`

## Call Signature

```ts
(
   prefix, 
   options, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `prefix` | `string` |
| `options` | `IOptions` |
| `callback` | `TCallback`\<`string`\> |

### Returns

`any`
