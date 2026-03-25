[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / mkdirSync

# Variable: mkdirSync()

```ts
const mkdirSync: {
  (path, options): string | undefined;
  (path, options?): void;
  (path, options?): string | undefined;
} = fs.mkdirSync;
```

## Call Signature

```ts
(path, options): string | undefined;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IMkdirOptions` & `object` |

### Returns

`string` \| `undefined`

## Call Signature

```ts
(path, options?): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options?` | `TMode` \| `IMkdirOptions` & `object` |

### Returns

`void`

## Call Signature

```ts
(path, options?): string | undefined;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options?` | `IMkdirOptions` \| `TMode` |

### Returns

`string` \| `undefined`
