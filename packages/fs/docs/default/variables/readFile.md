[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [default](../index.md) / readFile

# Variable: readFile()

```ts
const readFile: {
  (id, callback): any;
  (id, options, callback): any;
} = fs.readFile;
```

## Call Signature

```ts
(id, callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `callback` | `TCallback`\<`TDataOut`\> |

### Returns

`any`

## Call Signature

```ts
(
   id, 
   options, 
   callback): any;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `TFileId` |
| `options` | `string` \| `IReadFileOptions` |
| `callback` | `TCallback`\<`TDataOut`\> |

### Returns

`any`
