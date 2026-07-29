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

### mount()

```ts
mount(container: HTMLElement): void;
```

Mounts the preview system to a specified container element in the DOM.

Creates a credentialless iframe with srcdoc bootstrap that fetches
the preview HTML via the Service Worker.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | A DOM element where the preview iframe will be mounted. |

#### Returns

`void`

***

### ready()

```ts
ready(config: VrowzerConfig): Promise<boolean>;
```

Ready for preview system initialization.

This method initializes the Web Worker, Service Worker, and MessageChannel,
then syncs initial files to both workers.

#### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `config` | [`VrowzerConfig`](/packages/vrowzer/docs/default/interfaces/VrowzerConfig.md) |  |

#### Returns

`Promise<boolean>` — A promise that resolves to `true` if the boot process is successful, or `false` if it fails.

***

### reloadPreview()

```ts
reloadPreview(): void;
```

Reloads the preview iframe

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
