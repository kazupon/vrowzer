# Interface: VrowzerConfig

VrowzerConfig defines the configuration options for [`Vrowzer.ready`](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-ready)

## Signature

```ts
export interface VrowzerConfig
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `files` | `Record<string, string \| ArrayBuffer>` | A record of file paths and their corresponding content, which can be either a string or an ArrayBuffer. An ArrayBuffer is copied for the Web Worker when [`Vrowzer.ready`](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-ready) is called, and stays usable. Without `/index.html`, a default one is used: an empty `#app` element and a module script that loads `/main.js`. |
