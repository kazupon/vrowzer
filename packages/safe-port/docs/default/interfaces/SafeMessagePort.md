# Interface: SafeMessagePort&lt;T&gt;

Safe MessagePort wrapper interface

## Extends

- `Emittable`\<[`MessagePortEvents`](/packages/safe-port/docs/default/type-aliases/MessagePortEvents.md)\<`T`\>\>
- `Disposable`

## Signature

```ts
export interface SafeMessagePort<T = unknown> extends Emittable<MessagePortEvents<T>>, Disposable
```

## Type Parameters

| Name | Description |
| --- | --- |
| `T` = `unknown` | Message data type |

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `addEventListener` | `MessagePort['addEventListener']` |  |
| `dispatchEvent` | `MessagePort['dispatchEvent']` |  |
| `onmessage` | `MessagePort['onmessage']` |  |
| `onmessageerror` | `MessagePort['onmessageerror']` |  |
| `raw` | `MessagePort` |  |
| `removeEventListener` | `MessagePort['removeEventListener']` |  |

## Methods

### close()

```ts
close(): void;
```

#### Returns

`void`

***

### postMessage()

```ts
postMessage(message: any, transfer?: Transferable[]): void;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `message` | `any` |  |
| `transfer` | `Transferable[]` | _optional_ |

#### Returns

`void`

***

### start()

```ts
start(): void;
```

#### Returns

`void`
