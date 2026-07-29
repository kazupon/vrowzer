# Function: createSvcWorkerController()

Create a [Service worker controller](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md) instance.

This function implements a singleton pattern based on `scriptURL` and `version`.
If an instance already exists for the same scriptURL and version, it returns the existing instance.
If the options differ (excluding debug), it throws an error.

## Signature

```ts
export function createSvcWorkerController(options: SvcWorkerControllerOptions): Readonly<SvcWorkerController>
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`SvcWorkerControllerOptions`](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerOptions.md) | [Service worker controller options](/packages/service-worker/docs/controller/interfaces/SvcWorkerControllerOptions.md) |

## Returns

`Readonly`\<[`SvcWorkerController`](/packages/service-worker/docs/controller/interfaces/SvcWorkerController.md)\>

## Throws

- [`SvcWorkerControllerError`](/packages/service-worker/docs/controller/classes/SvcWorkerControllerError.md) — If an instance exists with different options
