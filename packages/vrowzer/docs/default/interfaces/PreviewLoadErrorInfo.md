# Interface: PreviewLoadErrorInfo

Information about a preview document that failed to load before its application code started.

## Signature

```ts
export interface PreviewLoadErrorInfo
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `error` _(optional, readonly)_ | `{ readonly name: string; readonly message: string }` | The original exception, when one was thrown. |
| `id` _(readonly)_ | `string` | Host-defined identity of the preview session that failed to load. |
| `message` _(readonly)_ | `string` | Human-readable summary of the failure. It is present even when the browser reports no details. |
| `stage` _(readonly)_ | `"html" \| "script"` | Where loading failed: fetching the preview HTML, or loading one of its initial scripts. |
| `status` _(optional, readonly)_ | `number` | HTTP status, when a response was received. |
| `url` _(optional, readonly)_ | `string` | Requested URL, when known. Inline module scripts have no URL. |
