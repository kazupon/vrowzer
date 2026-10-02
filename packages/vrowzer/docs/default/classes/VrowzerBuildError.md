# Class: VrowzerBuildError

The error of a [Vrowzer.build](/packages/vrowzer/docs/default/interfaces/Vrowzer.md#method-build) that failed: an error in the project, or an option that the
browser build does not support.

## Extends

- `Error`

## Signature

```ts
export class VrowzerBuildError extends Error
```

## Constructors

### Constructor

```ts
new VrowzerBuildError(errors: readonly VrowzerBuildLog[], options?: ErrorOptions): VrowzerBuildError;
```

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `errors` | `readonly` [`VrowzerBuildLog`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLog.md)\[\] | The errors of the build. |
| `options` | `ErrorOptions` | The options of `Error`, e.g. `cause`. _(optional)_ |

#### Returns

[`VrowzerBuildError`](/packages/vrowzer/docs/default/classes/VrowzerBuildError.md)

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `errors` _(readonly)_ | `readonly` [`VrowzerBuildLog`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildLog.md)\[\] | The errors of the build. The message summarizes the first one. |
