import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Vrowzer } from 'vrowzer'
// @ts-expect-error The manifest plugin loads paths relative to the shared manifest.
import manifest from '../vite-svelte/vrowzer-manifest.json?vrowzer'
import app from './preview/App.svelte?raw'

declare const __HOST_ONLY__: string

createRoot(document.getElementById('host-app')!).render(
  createElement('strong', { id: 'react-host' }, `React host: ${__HOST_ONLY__}`)
)

const status = document.getElementById('status')!
const vrowzer = Vrowzer()

async function init() {
  const ready = await vrowzer.ready({
    files: {
      ...manifest.files,
      ...manifest.nodeModules,
      '/App.svelte': app,
      '/vendor/preview-lib.js': 'export const label = "dedicated alias"'
    }
  })
  if (!ready) {
    status.textContent = 'Failed'
    return
  }
  vrowzer.mount(document.getElementById('app')!, { id: 'preview' })
  ;(window as any).__vrowzer__ = vrowzer
  status.textContent = 'Ready'
}

void init()
