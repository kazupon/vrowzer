[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / appendFile

# Variable: appendFile()

```ts
const appendFile: {
  (id, data, callback): any;
  (id, data, options, callback): any;
} = fs.appendFile;
```

## Call Signature

```ts
(
   id, 
   data, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `data` | `TData` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`

## Call Signature

```ts
(
   id, 
   data, 
   options, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `data` | `TData` |
| `options` | `string` \| `IAppendFileOptions` |
| `callback` | `TCallback`\<`void`\> |

### Returns

`any`
