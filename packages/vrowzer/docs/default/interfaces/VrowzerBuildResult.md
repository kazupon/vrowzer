# Interface: VrowzerBuildResult

The result of [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build).

## Signature

```ts
export interface VrowzerBuildResult
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `files` | `Record<string, string \| ArrayBuffer>` | The outputs, keyed by the path from the output root, e.g. `my-lib.js`. JavaScript, CSS, source maps and text assets are strings. Binary assets are ArrayBuffers. |
| `warnings` | [`VrowzerBuildLog`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLog.md)\[\] | The warnings of the build. |
