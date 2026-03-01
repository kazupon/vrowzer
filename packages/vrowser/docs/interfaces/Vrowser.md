[**vrowser**](../index.md)

***

[vrowser](../index.md) / Vrowser

# Interface: Vrowser

The main interface for the Vrowser preview environment.

## Methods

### addFile()

```ts
addFile(filePath, content): void;
```

Adds a new file to the preview environment with the specified content.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be added. |
| `content` | `string` \| `ArrayBuffer` | The content of the file, which can be a string or an ArrayBuffer. |

#### Returns

`void`

***

### deleteFile()

```ts
deleteFile(filePath): Promise<void>;
```

Deletes a specific file from the preview environment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be deleted. |

#### Returns

`Promise`\<`void`\>

***

### mount()

```ts
mount(container): Promise<void>;
```

Mounts the preview system to a specified container element in the DOM.

Creates a credentialless iframe with srcdoc bootstrap that fetches
the preview HTML via the Service Worker.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `container` | `HTMLElement` | A DOM element where the preview iframe will be mounted. |

#### Returns

`Promise`\<`void`\>

***

### ready()

```ts
ready(config): Promise<boolean>;
```

Ready for preview system initialization.

This method initializes the Web Worker, Service Worker, and MessageChannel,
then syncs initial files to both workers.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`VrowserConfig`](VrowserConfig.md) |

#### Returns

`Promise`\<`boolean`\>

A promise that resolves to `true` if the boot process is successful, or `false` if it fails.

***

### reloadPreview()

```ts
reloadPreview(): Promise<void>;
```

Reloads the preview iframe

#### Returns

`Promise`\<`void`\>

***

### updateFile()

```ts
updateFile(filePath, content): Promise<void>;
```

Updates the content of a specific file in the preview environment.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `filePath` | `string` | The path of the file to be updated. |
| `content` | `string` \| `ArrayBuffer` | The new content for the file, which can be a string or an ArrayBuffer. |

#### Returns

`Promise`\<`void`\>
