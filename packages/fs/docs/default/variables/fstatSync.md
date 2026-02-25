[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / fstatSync

# Variable: fstatSync()

```ts
const fstatSync: {
  (fd): Stats<number>;
  (fd, options): Stats<number>;
  (fd, options): Stats<bigint>;
} = fs.fstatSync;
```

## Call Signature

```ts
(fd): Stats<number>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |

### Returns

`Stats`\<`number`\>

## Call Signature

```ts
(fd, options): Stats<number>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | \{ `bigint`: `false`; \} |
| `options.bigint` | `false` |

### Returns

`Stats`\<`number`\>

## Call Signature

```ts
(fd, options): Stats<bigint>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `fd` | `number` |
| `options` | \{ `bigint`: `true`; \} |
| `options.bigint` | `true` |

### Returns

`Stats`\<`bigint`\>
