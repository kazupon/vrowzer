# Interface: VrowzerBuildLog

A log of [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build): an error or a warning.

## Signature

```ts
export interface VrowzerBuildLog
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `code` _(optional)_ | `string` | The code of the log, e.g. `PARSE_ERROR` from rolldown, or `VROWZER_UNSUPPORTED_OPTION` for an option that the browser build does not support. |
| `frame` _(optional)_ | `string` | The code around the location. |
| `id` _(optional)_ | `string` | The module that it is about. |
| `loc` _(optional)_ | `{ line: number; column: number; file?: string }` | The location in the module. The column starts at 0. |
| `message` | `string` | The message, without colors. |
| `plugin` _(optional)_ | `string` | The plugin that reported it. |
