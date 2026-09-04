# Interface: PreviewSession

A mounted preview iframe managed by a [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) instance.

## Signature

```ts
export interface PreviewSession
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `container` _(readonly)_ | `HTMLElement` | Container that owns the iframe. |
| `id` _(readonly)_ | `string` | Host-defined preview session identity. |
| `iframe` _(readonly)_ | `HTMLIFrameElement` | Iframe used by this preview session. |

## Methods

### reload()

```ts
reload(): void;
```

Reloads only this preview document.

#### Returns

`void`

***

### unmount()

```ts
unmount(): void;
```

Removes only this preview document.

#### Returns

`void`
