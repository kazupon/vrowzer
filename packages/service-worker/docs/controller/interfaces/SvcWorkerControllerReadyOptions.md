[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / SvcWorkerControllerReadyOptions

# Interface: SvcWorkerControllerReadyOptions

An options for SvcWorkerController.re \| Service Worker Controller

## Properties

| Property                                            | Type                                                        | Description                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| <a id="skipwaitingpolicy"></a> `skipWaitingPolicy?` | [`SkipWaitingPolicy`](../type-aliases/SkipWaitingPolicy.md) | Policy for `skipWaiting` **Default** `'strict'`                                                 |
| <a id="timeout"></a> `timeout?`                     | `number`                                                    | Timeout in milliseconds to wait for expected service worker to become active **Default** `3000` |
