# Interface: VrowzerBuildLibraryOptions

The library options of [VrowzerBuildOptions.build](/packages/vrowzer/docs/default/interfaces/VrowzerBuildOptions.md#property-build), a subset of Vite's `build.lib`.

## Signature

```ts
export interface VrowzerBuildLibraryOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `cssFileName` _(optional)_ | `string` | The name of the CSS file. Defaults to `fileName`. |
| `entry` | `string` | The entry of the library, e.g. `/src/index.ts`. Its exports are the API of the library. |
| `fileName` _(optional)_ | `string` | The name of the output file. Without it, the `name` of `/package.json` is used, and the build fails when there is none. |
| `formats` _(optional)_ | `["es"]` | The output formats. Only `es` is supported for now. **Default:** `['es']` |
