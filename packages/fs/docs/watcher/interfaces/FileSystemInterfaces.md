[**@vrowzer/fs**](../../index.md)

***

[@vrowzer/fs](../../index.md) / [watcher](../index.md) / FileSystemInterfaces

# Interface: FileSystemInterfaces

Minimal fs interface required by FileSystemSubscriber.

## Methods

### existsSync()

```ts
existsSync(path): boolean;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

#### Returns

`boolean`

***

### mkdirSync()

```ts
mkdirSync(path, options?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `options?` | `any` |

#### Returns

`void`

***

### unlinkSync()

```ts
unlinkSync(path): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

#### Returns

`void`

***

### writeFileSync()

```ts
writeFileSync(
   path, 
   data, 
   options?): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `data` | `any` |
| `options?` | `any` |

#### Returns

`void`
