[**@vrowser/service-worker**](../../index.md)

---

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionInitResponse

# Function: createSvcWorkerSessionInitResponse()

```ts
function createSvcWorkerSessionInitResponse(success, version): SvcWorkerSessionInitResponse;
```

Create a [service worker 'V_SW_SESSION_INIT' response](../interfaces/SvcWorkerSessionInitResponse.md)

## Parameters

| Parameter | Type      | Description                                       |
| --------- | --------- | ------------------------------------------------- |
| `success` | `boolean` | Whether the session initialization was successful |
| `version` | `string`  | The version of the service worker                 |

## Returns

[`SvcWorkerSessionInitResponse`](../interfaces/SvcWorkerSessionInitResponse.md)

The constructed [SvcWorkerSessionInitResponse](../interfaces/SvcWorkerSessionInitResponse.md)
