# Type Alias: VrowzerEventMap

Event map for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

Forwards all SvcWorkerControllerEventMap events from the underlying Service Worker controller,
and adds events for preview sessions.

## Signature

```ts
export type VrowzerEventMap = SvcWorkerControllerEventMap & { previewLoadError: PreviewLoadErrorInfo }
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `previewLoadError` | [`PreviewLoadErrorInfo`](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) | Emitted when a preview document fails to load before its application code starts: the preview HTML cannot be fetched or returns an error status, or one of its initial scripts fails to load. Runtime errors thrown by the application are not reported by this event. Payload is [PreviewLoadErrorInfo](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) |
