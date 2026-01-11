[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / SvcWorkerSessionTerminatedMessage

# Interface: SvcWorkerSessionTerminatedMessage

Terminated notification message (Service Worker -> Page via session MessagePort)

## Extends

- [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md)

## Properties

| Property                     | Type                              | Description                | Overrides                                                                                |
| ---------------------------- | --------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| <a id="reason"></a> `reason` | `"unregister"`                    | The reason for termination | -                                                                                        |
| <a id="type"></a> `type`     | `"VROWSER_SW_SESSION_TERMINATED"` | -                          | [`SvcWorkerMessageBase`](SvcWorkerMessageBase.md).[`type`](SvcWorkerMessageBase.md#type) |
