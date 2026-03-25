[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / realpath

# Variable: realpath

```ts
const realpath: {
  (path, callback): void;
  (path, options, callback): void;
  native: {
     (path, callback): void;
     (path, options, callback): void;
  };
} = fs.realpath;
```

## Type Declaration

## Call Signature

```ts
(path, callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`TDataOut`\> |

### Returns

`void`

## Call Signature

```ts
(
   path, 
   options, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `string` \| `IRealpathOptions` |
| `callback` | `TCallback`\<`TDataOut`\> |

### Returns

`void`

### native()

```ts
native: {
  (path, callback): void;
  (path, options, callback): void;
};
```

#### Call Signature

```ts
(path, callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `callback` | `TCallback`\<`TDataOut`\> |

##### Returns

`void`

#### Call Signature

```ts
(
   path, 
   options, 
   callback): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `string` \| `IRealpathOptions` |
| `callback` | `TCallback`\<`TDataOut`\> |

##### Returns

`void`
