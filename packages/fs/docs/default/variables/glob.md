[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / glob

# Variable: glob()

```ts
const glob: {
  (pattern, callback): void;
  (pattern, options, callback): void;
} = fs.glob;
```

## Call Signature

```ts
(pattern, callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `pattern` | `string` |
| `callback` | `TCallback`\<`string`[]\> |

### Returns

`void`

## Call Signature

```ts
(
   pattern, 
   options, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `pattern` | `string` |
| `options` | `IGlobOptions` |
| `callback` | `TCallback`\<`string`[]\> |

### Returns

`void`
