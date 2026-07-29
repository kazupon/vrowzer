# Function: createSvcWorkerSessionInitResponse()

Create a [service worker 'V_SW_SESSION_INIT' response](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md).

## Signature

```ts
export function createSvcWorkerSessionInitResponse(success: boolean, version: string, suspended?: boolean): SvcWorkerSessionInitResponse
```

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | Whether the session initialization was successful |
| `version` | `string` | The version of the service worker |
| `suspended` | `boolean` | Whether the service worker is in suspended state (optional for backward compatibility) _(optional)_ |

## Returns

[`SvcWorkerSessionInitResponse`](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md) — The constructed [SvcWorkerSessionInitResponse](/packages/service-worker/docs/protocols/interfaces/SvcWorkerSessionInitResponse.md)
