# Interface: PreviewContext

Context exposed to the mounted preview document.

## Signature

```ts
export interface PreviewContext
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `id` _(readonly)_ | `string` | Host-defined preview session identity. |
| `params` _(optional, readonly)_ | `Readonly<Record<string, string>>` | Optional values provided when the preview session was mounted. |
