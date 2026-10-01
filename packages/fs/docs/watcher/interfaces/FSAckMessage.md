# Interface: FSAckMessage

Worker -> Main Thread: Acknowledge a message that has an `id`.

`@vrowzer/fs` does not send it by itself. A Worker sends it after applying the message,
with `error` when applying failed.

## Signature

```ts
export interface FSAckMessage
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `error` _(optional)_ | `{ name: string; message: string }` | Why applying the message failed. Absent when it succeeded. |
| `id` | `string` | The `id` of the acknowledged message. |
| `type` | `"V_FS_ACK"` |  |
