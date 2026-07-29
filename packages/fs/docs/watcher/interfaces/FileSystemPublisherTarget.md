# Interface: FileSystemPublisherTarget

A postMessage target compatible like Service Worker and Web Worker APIs.

## Signature

```ts
export interface FileSystemPublisherTarget
```

## Methods

### postMessage()

```ts
postMessage(message: any, transfer: Transferable[]): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `any` |  |
| `transfer` | `Transferable[]` |  |

#### Returns

`void`

***

### postMessage()

```ts
postMessage(message: any, options?: StructuredSerializeOptions): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `any` |  |
| `options` | `StructuredSerializeOptions` | _optional_ |

#### Returns

`void`
