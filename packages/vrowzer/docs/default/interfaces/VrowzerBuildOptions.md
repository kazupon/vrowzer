# Interface: VrowzerBuildOptions

Options for [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build): a subset of the Vite config.

They are merged over the Worker config, and sent to the build Worker, so they must be values that
`postMessage()` can copy, e.g. no functions.

## Signature

```ts
export interface VrowzerBuildOptions
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `base` _(optional)_ | `string` | The public base path of the outputs (Vite's `base`). **Default:** `'/'` |
| `build` _(optional)_ | { `lib`?: [`VrowzerBuildLibraryOptions`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLibraryOptions.md) \| `false`; `minify`?: `boolean`; `sourcemap`?: `boolean` \| "inline" \| "hidden"; `assetsDir`?: `string`; `assetsInlineLimit`?: `number`; `cssCodeSplit`?: `boolean`; `target`?: `string` \| `string`\[\]; `modulePreload`?: `boolean` \| { `polyfill`?: `boolean` }; `rolldownOptions`?: { `input`?: `string`; `external`?: (`string` \| `RegExp`)\[\]; `output`?: { `codeSplitting`?: `boolean` } } } | Build options: a subset of Vite's `build`. |
| `define` _(optional)_ | `Record<string, unknown>` | Global constants to replace (Vite's `define`), merged over the `define` of the Worker config. |
| `mode` _(optional)_ | `string` | The mode (Vite's `mode`), which `import.meta.env.MODE` returns. **Default:** `'production'` |
| `signal` _(optional)_ | `AbortSignal` | Cancels the build. The build Worker is terminated, and the promise rejects with the reason. |
