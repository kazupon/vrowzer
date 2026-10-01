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
addFile(filePath: string, content: string | ArrayBuffer): Promise<void>;
```

Adds a new file to the preview environment with the specified content.

The promise resolves when later preview requests see the change: the Web Worker and the
Service Worker have written the file to their virtual filesystems, and the Web Worker has
invalidated the modules that depend on it. HMR updates of mounted previews are not awaited.

It rejects without sending the change before [Vrowzer.ready](#method-ready) resolves to `true`, after it
fails, and after [Vrowzer.dispose](#method-dispose). It also rejects when a Worker fails to apply the change,
when the Web Worker reports an error, when the Workers do not reply within
[VrowzerOptions.fileSyncTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-filesynctimeout), or when the instance is disposed first. The change may
be partly applied then; write the file again to resynchronize.

Public files (under `/public/`) are currently not served by the Service Worker, so they do not
become visible to preview requests.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be added. |
| `content` | `string \| ArrayBuffer` | The content of the file, which can be a string or an ArrayBuffer. An ArrayBuffer is copied for the Workers and stays usable. |

#### Returns

`Promise<void>`

***

### deleteFile()

```ts
deleteFile(filePath: string): Promise<void>;
```

Deletes a specific file from the preview environment.

The promise resolves when later preview requests no longer see the file, and rejects as with
[Vrowzer.addFile](#method-addfile). Deleting a file that does not exist resolves as well.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be deleted. |

#### Returns

`Promise<void>`

***

### dispose()

```ts
dispose(): Promise<void>;
```

Disposes this instance.

An in-progress [Vrowzer.ready](#method-ready) is aborted and resolves to `false`. Every preview session
is unmounted, the Web Worker is terminated, Service Worker controller events are no longer
forwarded, and all event handlers are removed right away. The Service Worker registration and
its virtual filesystem are kept for other clients.

File operations still waiting for the Workers reject. After disposal, `ready()` and the file
methods reject, `mount()` throws, and `unmount()` and `reloadPreview()` do nothing. Create a
new instance to start again.

#### Returns

`Promise<void>` — A promise that resolves when every resource is released. Calling this method again returns the same promise. It rejects with an `AggregateError` when some resources could not be released; the remaining resources are still released.

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
Use [Vrowzer.dispose](#method-dispose) to release the whole instance.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `target` | [`PreviewSessionRef`](/packages/vrowzer/docs/default/type-aliases/PreviewSessionRef.md) | A session ID or mounted session object. _(optional)_ |

#### Returns

`void`

***

### updateFile()

```ts
updateFile(filePath: string, content: string | ArrayBuffer): Promise<void>;
```

Updates the content of a specific file in the preview environment.

The promise resolves and rejects as with [Vrowzer.addFile](#method-addfile).

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be updated. |
| `content` | `string \| ArrayBuffer` | The new content for the file, which can be a string or an ArrayBuffer. An ArrayBuffer is copied for the Workers and stays usable. |

#### Returns

`Promise<void>`
