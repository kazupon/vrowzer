[**@vrowser/fs**](../../index.md)

***

[@vrowser/fs](../../index.md) / [watcher](../index.md) / FileSystemPublisherTarget

# Interface: FileSystemPublisherTarget

A postMessage target compatible like Service Worker and Web Worker APIs.

## Methods

### postMessage()

#### Call Signature

```ts
postMessage(message, transfer): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `any` |
| `transfer` | `Transferable`[] |

##### Returns

`void`

#### Call Signature

```ts
postMessage(message, options?): void;
```

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `any` |
| `options?` | `StructuredSerializeOptions` |

##### Returns

`void`
