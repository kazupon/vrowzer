# Type Alias: MessagePortEvents&lt;T&gt;

Message port events

## Signature

```ts
export type MessagePortEvents<T = unknown> = { message: MessageEvent<T>; messageerror: MessageEvent; close: undefined; [key: string]: unknown }
```

## Type Parameters

| Name | Description |
| --- | --- |
| `T` = `unknown` | Message data type |

## Indexable

```ts
[key: string]: unknown
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `close` | `undefined` |  |
| `message` | `MessageEvent<T>` |  |
| `messageerror` | `MessageEvent` |  |
