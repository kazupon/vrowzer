[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / statSync

# Variable: statSync()

```ts
const statSync: {
  (path): Stats<number>;
  (path, options): Stats<number>;
  (path, options): Stats<number> | undefined;
  (path, options): Stats<number>;
  (path, options): Stats<bigint>;
  (path, options): Stats<number> | undefined;
  (path, options): Stats<bigint> | undefined;
} = fs.statSync;
```

## Call Signature

```ts
(path): Stats<number>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |

### Returns

`Stats`\<`number`\>

## Call Signature

```ts
(path, options): Stats<number>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `throwIfNoEntry?`: `true`; \} |
| `options.throwIfNoEntry?` | `true` |

### Returns

`Stats`\<`number`\>

## Call Signature

```ts
(path, options): Stats<number> | undefined;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `throwIfNoEntry`: `false`; \} |
| `options.throwIfNoEntry` | `false` |

### Returns

`Stats`\<`number`\> \| `undefined`

## Call Signature

```ts
(path, options): Stats<number>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `false`; `throwIfNoEntry?`: `true`; \} |
| `options.bigint` | `false` |
| `options.throwIfNoEntry?` | `true` |

### Returns

`Stats`\<`number`\>

## Call Signature

```ts
(path, options): Stats<bigint>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `true`; `throwIfNoEntry?`: `true`; \} |
| `options.bigint` | `true` |
| `options.throwIfNoEntry?` | `true` |

### Returns

`Stats`\<`bigint`\>

## Call Signature

```ts
(path, options): Stats<number> | undefined;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `false`; `throwIfNoEntry`: `false`; \} |
| `options.bigint` | `false` |
| `options.throwIfNoEntry` | `false` |

### Returns

`Stats`\<`number`\> \| `undefined`

## Call Signature

```ts
(path, options): Stats<bigint> | undefined;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | \{ `bigint`: `true`; `throwIfNoEntry`: `false`; \} |
| `options.bigint` | `true` |
| `options.throwIfNoEntry` | `false` |

### Returns

`Stats`\<`bigint`\> \| `undefined`
