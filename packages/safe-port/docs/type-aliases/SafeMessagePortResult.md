[**@vrowzer/safe-port**](../index.md)

***

[@vrowzer/safe-port](../index.md) / SafeMessagePortResult

# Type Alias: SafeMessagePortResult\<T\>

```ts
type SafeMessagePortResult<T> = Readonly<Omit<SafeMessagePort<T>, "onmessage" | "onmessageerror">> & Pick<SafeMessagePort<T>, "onmessage" | "onmessageerror">;
```

Return type for [safeMessagePort](../functions/safeMessagePort.md)

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | `unknown` | Message data type |
