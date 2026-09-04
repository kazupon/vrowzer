# Interface: Vrowzer

The main interface for the Vrowzer preview environment.

## Extends

- `Emittable`\<[`VrowzerEventMap`](/packages/vrowzer/docs/default/type-aliases/VrowzerEventMap.md)\>

## Signature

```ts
export interface Vrowzer extends Emittable<VrowzerEventMap>
```

## Methods

### addFile()

```ts
addFile(filePath: string, content: string | ArrayBuffer): void;
```

Adds a new file to the preview environment with the specified content.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be added. |
| `content` | `string \| ArrayBuffer` | The content of the file, which can be a string or an ArrayBuffer. |

#### Returns

`void`

***

### deleteFile()

```ts
deleteFile(filePath: string): void;
```

Deletes a specific file from the preview environment.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be deleted. |

#### Returns

`void`

***

### getSession()

```ts
getSession(id: string): PreviewSession | undefined;
```

Returns the currently mounted preview session for an ID.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Host-defined preview session identity. |

#### Returns

[`PreviewSession`](/packages/vrowzer/docs/default/interfaces/PreviewSession.md) | `undefined`

***

### mount()

```ts
mount(container: HTMLElement, options: PreviewMountOptions): PreviewSession;
```

Mounts the preview system to a specified container element in the DOM.

Creates a credentialless iframe with srcdoc bootstrap that fetches
the preview HTML via the Service Worker.

Reusing an existing session ID returns the original session without reloading or moving it.
The container and params from the first mount remain in effect.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | A DOM element where the preview iframe will be mounted. |
| `options` | [`PreviewMountOptions`](/packages/vrowzer/docs/default/interfaces/PreviewMountOptions.md) | Preview identity and context values. |

#### Returns

[`PreviewSession`](/packages/vrowzer/docs/default/interfaces/PreviewSession.md) — The mounted preview session.

***

### ready()

```ts
ready(config: VrowzerConfig): Promise<boolean>;
```

Ready for preview system initialization.

This method initializes the Web Worker, Service Worker, and MessageChannel,
then syncs initial files to both workers.
It can only be called once per Vrowzer instance.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `config` | [`VrowzerConfig`](/packages/vrowzer/docs/default/interfaces/VrowzerConfig.md) |  |

#### Returns

`Promise<boolean>` — A promise that resolves to `true` if the boot process is successful, or `false` if it fails.

***

### reloadPreview()

```ts
reloadPreview(target?: PreviewSessionRef): void;
```

Reloads one preview session, or every session when no target is provided.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | [`PreviewSessionRef`](/packages/vrowzer/docs/default/type-aliases/PreviewSessionRef.md) | A session ID or mounted session object. _(optional)_ |

#### Returns

`void`

***

### sessions()

```ts
sessions(): readonly PreviewSession[];
```

Returns a snapshot of all currently mounted preview sessions.

#### Returns

`readonly` [`PreviewSession`](/packages/vrowzer/docs/default/interfaces/PreviewSession.md)\[\]

***

### unmount()

```ts
unmount(target?: PreviewSessionRef): void;
```

Unmounts one preview session, or every session when no target is provided.
The shared Service Worker, Web Worker, and virtual filesystem remain active.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | [`PreviewSessionRef`](/packages/vrowzer/docs/default/type-aliases/PreviewSessionRef.md) | A session ID or mounted session object. _(optional)_ |

#### Returns

`void`

***

### updateFile()

```ts
updateFile(filePath: string, content: string | ArrayBuffer): void;
```

Updates the content of a specific file in the preview environment.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be updated. |
| `content` | `string \| ArrayBuffer` | The new content for the file, which can be a string or an ArrayBuffer. |

#### Returns

`void`
