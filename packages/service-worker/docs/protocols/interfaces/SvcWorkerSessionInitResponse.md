# Interface: SvcWorkerSessionInitResponse

SESSION_INIT response (Service Worker -> Page via MessagePort).

## Signature

```ts
export interface SvcWorkerSessionInitResponse
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `success` | `boolean` |  |
| `suspended` _(optional)_ | `boolean` | Whether the service worker is currently in suspended state (circuit breaker engaged). Optional for backward compatibility with older service workers. |
| `type` | `typeof` [`V_SW_SESSION_INIT`](/packages/service-worker/docs/protocols/variables/V_SW_SESSION_INIT.md) |  |
| `version` | `string` |  |
