[**@vrowser/service-worker**](../../index.md)

***

[@vrowser/service-worker](../../index.md) / [protocols](../index.md) / createSvcWorkerSessionInitResponse

# Function: createSvcWorkerSessionInitResponse()

```ts
function createSvcWorkerSessionInitResponse(
   success, 
   version, 
   suspended?): SvcWorkerSessionInitResponse;
```

Create a [service worker 'V\_SW\_SESSION\_INIT' response](../interfaces/SvcWorkerSessionInitResponse.md).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `success` | `boolean` | Whether the session initialization was successful |
| `version` | `string` | The version of the service worker |
| `suspended?` | `boolean` | Whether the service worker is in suspended state (optional for backward compatibility) |

## Returns

[`SvcWorkerSessionInitResponse`](../interfaces/SvcWorkerSessionInitResponse.md)

The constructed [SvcWorkerSessionInitResponse](../interfaces/SvcWorkerSessionInitResponse.md)
