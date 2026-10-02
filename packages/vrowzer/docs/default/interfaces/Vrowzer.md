# Interface: Vrowzer

The main interface for the Vrowzer preview environment.

## Extends

- `Emittable`\<[`VrowzerEventMap`](/packages/vrowzer/docs/default/type-aliases/VrowzerEventMap.md)\>

## Signature

```ts
export interface Vrowzer extends Emittable<VrowzerEventMap>
```

## Properties

| Name | Type | Description |
| --- | --- | --- |
| `previewBasePath` _(readonly)_ | `string` | The base path of the previews of this instance: [VrowzerOptions.basePath](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-basepath) followed by an ID of the instance, e.g. `/__preview__/0123456789ab/`. The previews load from it, and it is the Vite `base` of the project, which `import.meta.env.BASE_URL` returns in the preview. The Service Worker forwards the requests under it to the Web Worker of this instance, so several instances can share one Service Worker, e.g. in two tabs. It is set when [Vrowzer](/packages/vrowzer/docs/default/interfaces/Vrowzer.md) is called, and stays the same after [Vrowzer.dispose](#method-dispose). |

## Methods

### addFile()

```ts
addFile(filePath: string, content: string | ArrayBuffer): Promise<void>;
```

Adds a new file to the preview environment with the specified content.

The promise resolves when later preview requests see the change: the Web Worker has written the
file to its virtual filesystem, and invalidated the modules that depend on it. HMR updates of
mounted previews are not awaited.

It rejects without sending the change before [Vrowzer.ready](#method-ready) resolves to `true`, after it
fails, and after [Vrowzer.dispose](#method-dispose). It also rejects when the Web Worker fails to apply the
change, when it reports an error, when it does not reply within
[VrowzerOptions.fileSyncTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-filesynctimeout), or when the instance is disposed first. The change may
be partly applied then; write the file again to resynchronize.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be added. |
| `content` | `string \| ArrayBuffer` | The content of the file, which can be a string or an ArrayBuffer. An ArrayBuffer is copied for the Web Worker and stays usable. |

#### Returns

`Promise<void>`

***

### build()

```ts
build(options?: VrowzerBuildOptions): Promise<VrowzerBuildResult>;
```

Builds the project for production in a build Worker, e.g. as a library.

The build uses the project files as they are when this method is called: the files of
[Vrowzer.ready](#method-ready), with the default `/index.html` when they have none, and the changes of
the file methods called before. Changes made later are not included, even before the build
ends.

Each build runs in a new build Worker, with the Worker config bundled for production, and the
build Worker is terminated when the build ends. The previews are not affected. Only library
builds (`build.lib`) in the `es` format are supported for now, and one build at a time.

A closed build Worker takes about 2 seconds to stop in Chromium. When 4 of them closed within
the last 2.5 seconds, e.g. after short builds one after another, a build waits before it
creates its build Worker. The wait does not count toward [VrowzerOptions.buildTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-buildtimeout).

It needs the `build` option of `@vrowzer/vite-plugin`.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `options` | [`VrowzerBuildOptions`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildOptions.md) | The options of the build, merged over the Worker config. _(optional)_ |

#### Returns

`Promise`\<[`VrowzerBuildResult`](/packages/vrowzer/docs/default/interfaces/VrowzerBuildResult.md)\> — The outputs and the warnings.

#### Throws

- Rejects before [Vrowzer.ready](#method-ready) resolves to `true`, after [Vrowzer.dispose](#method-dispose), when the `build` option of the plugin is not enabled, and while another build is running. Rejects with a [VrowzerBuildError](/packages/vrowzer/docs/default/classes/VrowzerBuildError.md) when the build fails, e.g. with an error in the project or an unsupported option. Rejects with an `Error` when the build does not finish within [VrowzerOptions.buildTimeout](/packages/vrowzer/docs/default/interfaces/VrowzerOptions.md#property-buildtimeout), when the build Worker fails, or when [Vrowzer.dispose](#method-dispose) is called first, and with the reason of `signal` when it is aborted.

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

An in-progress [Vrowzer.ready](#method-ready) is aborted and resolves to `false`, and the reconnection of
a restarted Service Worker is stopped. Every preview session is unmounted, the Web Worker is
terminated with the project files, Service Worker controller events are no longer forwarded, and
all event handlers are removed right away. The Service Worker registration is kept for other
clients, and answers the requests under [Vrowzer.previewBasePath](#property-previewbasepath) with 404 from then on.

File operations still waiting for the Web Worker reject, and a running [Vrowzer.build](#method-build)
rejects with its build Worker terminated. After disposal, `ready()`, the file methods and
`build()` reject, `mount()` throws, and `unmount()` and `reloadPreview()` do nothing. Create a
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

This method initializes the Web Worker with the initial files, the Service Worker, and the
MessageChannel between them.
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
The Service Worker, the Web Worker, and its virtual filesystem remain active.
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
| `content` | `string \| ArrayBuffer` | The new content for the file, which can be a string or an ArrayBuffer. An ArrayBuffer is copied for the Web Worker and stays usable. |

#### Returns

`Promise<void>`
