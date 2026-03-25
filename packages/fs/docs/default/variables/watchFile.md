[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / watchFile

# Variable: watchFile()

```ts
const watchFile: {
  (path, listener): StatWatcher;
  (path, options, listener): StatWatcher;
} = fs.watchFile;
```

## Call Signature

```ts
(path, listener): StatWatcher;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `listener` | (`curr`, `prev`) => `void` |

### Returns

`StatWatcher`

## Call Signature

```ts
(
   path, 
   options, 
   listener): StatWatcher;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `PathLike` |
| `options` | `IWatchFileOptions` |
| `listener` | (`curr`, `prev`) => `void` |

### Returns

`StatWatcher`
