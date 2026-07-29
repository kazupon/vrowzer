# Type Alias: SafeMessagePortResult&lt;T&gt;

Return type for [safeMessagePort](/packages/safe-port/docs/default/functions/safeMessagePort.md)

## Signature

```ts
export type SafeMessagePortResult<T = unknown> = Readonly<Omit<SafeMessagePort<T>, 'onmessage' | 'onmessageerror'>> & Pick<SafeMessagePort<T>, 'onmessage' | 'onmessageerror'>
```

## Type Parameters

| Name | Description |
| --- | --- |
| `T` = `unknown` | Message data type |
