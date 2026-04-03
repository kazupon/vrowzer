[**@vrowzer/safe-port**](../index.md)

***

[@vrowzer/safe-port](../index.md) / MessagePortEvents

# Type Alias: MessagePortEvents\<T\>

```ts
type MessagePortEvents<T> = object;
```

Message port events

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | `unknown` | Message data type |

## Indexable

```ts
[key: string]: unknown
```

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-close"></a> `close` | `undefined` |
| <a id="property-message"></a> `message` | `MessageEvent`\<`T`\> |
| <a id="property-messageerror"></a> `messageerror` | `MessageEvent` |
