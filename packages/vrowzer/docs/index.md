**vrowzer**

***

# vrowzer

Vrowzer - Preview with Vite HMR flavor for the browser

## Example

```ts
import { Vrowzer } from 'vrowzer'

const vrowzer = Vrowzer({ basePath: '/__preview__/' })

// Initialize with files
const ready = await vrowzer.ready({
  files: {
    '/main.js': `
      document.getElementById('app').innerHTML = '<h1>Hello!</h1>'
      if (import.meta.hot) { import.meta.hot.accept() }
    `
  }
})

if (ready) {
  // Mount preview iframe into a container element
  await vrowzer.mount(document.getElementById('preview-container'))
}

// Update files (triggers HMR)
await vrowzer.updateFile(
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
| [Vrowzer](functions/Vrowzer.md) | Factory function to create a [Vrowzer](functions/Vrowzer.md) instance. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [Vrowzer](interfaces/Vrowzer.md) | The main interface for the Vrowzer preview environment. |
| [VrowzerConfig](interfaces/VrowzerConfig.md) | VrowzerConfig defines the configuration options for [`Vrowzer.ready`](interfaces/Vrowzer.md#ready) |
| [VrowzerOptions](interfaces/VrowzerOptions.md) | VrowzerOptions defines the configuration options for [Vrowzer](functions/Vrowzer.md). |
