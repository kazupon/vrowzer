# Type Alias: VrowzerEventMap

Event map for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

Forwards all SvcWorkerControllerEventMap events from the underlying Service Worker controller,
and adds events for preview sessions and for reconnecting a restarted Service Worker.

## Signature

```ts
export type VrowzerEventMap = SvcWorkerControllerEventMap & { previewLoadError: PreviewLoadErrorInfo; serviceWorkerRecovered: void; serviceWorkerRecoveryError: Error }
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `previewLoadError` | [`PreviewLoadErrorInfo`](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) | Emitted when a preview document fails to load before its application code starts: the preview HTML cannot be fetched or returns an error status, or one of its initial scripts fails to load. Runtime errors thrown by the application are not reported by this event. Payload is [PreviewLoadErrorInfo](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) |
| `serviceWorkerRecovered` | `void` | Emitted when Vrowzer has connected a restarted Service Worker to the Web Worker again. The browser stops an idle Service Worker and starts it again for the next request or message. The restarted Service Worker has lost its channel to the Web Worker, which keeps the project files, so Vrowzer connects the channel again, without reloading the host page. File operations go on in the meantime. |
| `serviceWorkerRecoveryError` | `Error` | Emitted when Vrowzer could not connect a restarted Service Worker to the Web Worker again within [VrowzerOptions.fileSyncTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-filesynctimeout). Preview requests that the Service Worker cannot forward yet wait for up to 10 seconds, and then get a 503 response. Vrowzer tries again when the Service Worker restarts the next time. To start over, dispose the instance and create a new one. Payload is the `Error` that describes the failure. |
