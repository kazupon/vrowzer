# Interface: FileSystemInterfaces

Minimal fs interface required by FileSystemSubscriber.

## Signature

```ts
export interface FileSystemInterfaces
```

## Methods

### existsSync()

```ts
existsSync(path: string): boolean;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |

#### Returns

`boolean`

***

### mkdirSync()

```ts
mkdirSync(path: string, options?: any): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `options` | `any` | _optional_ |

#### Returns

`void`

***

### unlinkSync()

```ts
unlinkSync(path: string): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |

#### Returns

`void`

***

### writeFileSync()

```ts
writeFileSync(path: string, data: any, options?: any): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `data` | `any` |  |
| `options` | `any` | _optional_ |

#### Returns

`void`
