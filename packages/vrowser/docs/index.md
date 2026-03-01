**vrowser**

***

# vrowser

Vrowser - Preview with Vite HMR flavor for the browser

## Example

```ts
import { Vrowser } from 'vrowser'

const vrowser = Vrowser({ basePath: '/__preview__/' })

// Initialize with files
const ready = await vrowser.ready({
  files: {
    '/main.js': `
      document.getElementById('app').innerHTML = '<h1>Hello!</h1>'
      if (import.meta.hot) { import.meta.hot.accept() }
    `
  }
})

if (ready) {
  // Mount preview iframe into a container element
  await vrowser.mount(document.getElementById('preview-container'))
}

// Update files (triggers HMR)
await vrowser.updateFile(
  '/main.js',
  `
  document.getElementById('app').innerHTML = '<h1>Updated!</h1>'
  if (import.meta.hot) { import.meta.hot.accept() }
`
)
```

## Functions

| Function | Description |
| ------ | ------ |
| [Vrowser](functions/Vrowser.md) | Factory function to create a [Vrowser](functions/Vrowser.md) instance. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Vrowser](interfaces/Vrowser.md) | The main interface for the Vrowser preview environment. |
| [VrowserConfig](interfaces/VrowserConfig.md) | VrowserConfig defines the configuration options for [`Vrowser.ready`](interfaces/Vrowser.md#ready) |
| [VrowserOptions](interfaces/VrowserOptions.md) | VrowserOptions defines the configuration options for [Vrowser](functions/Vrowser.md). |
