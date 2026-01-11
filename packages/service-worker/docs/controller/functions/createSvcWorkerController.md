[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [controller](../index.md) / createSvcWorkerController

# Function: createSvcWorkerController()

```ts
function createSvcWorkerController(options): Readonly<SvcWorkerController>;
```

Create a [Service worker controller](../interfaces/SvcWorkerController.md) instance.

This function implements a singleton pattern based on `scriptURL` and `version`.
If an instance already exists for the same scriptURL and version, it returns the existing instance.
If the options differ (excluding debug), it throws an error.

## Parameters

| Parameter | Type                                                                        | Description                                                                      |
| --------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `options` | [`SvcWorkerControllerOptions`](../interfaces/SvcWorkerControllerOptions.md) | [Service worker controller options](../interfaces/SvcWorkerControllerOptions.md) |

## Returns

`Readonly`\<[`SvcWorkerController`](../interfaces/SvcWorkerController.md)\>

[Service worker controller instance](../interfaces/SvcWorkerController.md)

## Throws

If an instance exists with different options
