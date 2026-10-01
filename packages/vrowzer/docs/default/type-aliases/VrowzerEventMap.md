# Type Alias: VrowzerEventMap

Event map for [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md).

Forwards all SvcWorkerControllerEventMap events from the underlying Service Worker controller,
and adds events for preview sessions and for restoring a restarted Service Worker.

## Signature

```ts
export type VrowzerEventMap = SvcWorkerControllerEventMap & { previewLoadError: PreviewLoadErrorInfo; serviceWorkerRecovered: void; serviceWorkerRecoveryError: Error }
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `previewLoadError` | [`PreviewLoadErrorInfo`](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) | Emitted when a preview document fails to load before its application code starts: the preview HTML cannot be fetched or returns an error status, or one of its initial scripts fails to load. Runtime errors thrown by the application are not reported by this event. Payload is [PreviewLoadErrorInfo](/packages/vrowzer/docs/default/interfaces/PreviewLoadErrorInfo.md) |
| `serviceWorkerRecovered` | `void` | Emitted when Vrowzer has restored the project in a restarted Service Worker. The browser stops an idle Service Worker and starts it again for the next request or message. The restarted Service Worker has lost the files and the Web Worker channel, so Vrowzer sends the latest files and connects the channel again, without reloading the host page. File operations called in the meantime are sent after the project is restored. |
| `serviceWorkerRecoveryError` | `Error` | Emitted when Vrowzer could not restore the project in a restarted Service Worker: the Service Worker failed to apply the files, or the recovery did not finish within [VrowzerOptions.fileSyncTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-filesynctimeout). File operations waiting for the Service Worker reject. Preview requests that the Service Worker cannot serve yet wait for up to 10 seconds, and then get a 503 response. Vrowzer tries again when the Service Worker restarts the next time. To start over, dispose the instance and create a new one. Payload is the `Error` that describes the failure. |
