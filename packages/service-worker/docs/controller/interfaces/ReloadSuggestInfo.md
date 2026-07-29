# Interface: ReloadSuggestInfo

Reload suggest information for service worker.

## Signature

```ts
export interface ReloadSuggestInfo
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `reason` | [`ReloadSuggestReason`](/packages/service-worker/docs/controller/type-aliases/ReloadSuggestReason.md) | The reason for suggesting reload. |
| `version` | `string` | The version of the service worker for suggesting reload. |
