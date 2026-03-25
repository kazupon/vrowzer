[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [default](../index.md) / writeFile

# Variable: writeFile()

```ts
const writeFile: {
  (id, data, callback): void;
  (id, data, options, callback): void;
} = fs.writeFile;
```

## Call Signature

```ts
(
   id, 
   data, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `data` | `TData` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`void`

## Call Signature

```ts
(
   id, 
   data, 
   options, 
   callback): void;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `data` | `TData` |
| `options` | `string` \| `IWriteFileOptions` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`void`
