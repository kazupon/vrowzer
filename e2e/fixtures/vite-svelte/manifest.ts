import type { FixtureManifest } from '../types.ts'

import indexHtml from './index.html?raw'
import mainTs from './main.ts?raw'
import appSvelte from './App.svelte?raw'
import counterSvelte from './Counter.svelte?raw'
import appCss from './app.css?raw'
import svelteSvg from './svelte.svg?raw'
import vrowserSvg from './vrowser.svg?raw'

export default {
  name: 'Vrowser + Svelte',
  files: {
    '/index.html': indexHtml,
    '/main.ts': mainTs,
    '/App.svelte': appSvelte,
    '/Counter.svelte': counterSvelte,
    '/app.css': appCss,
    '/svelte.svg': svelteSvg,
    '/vrowser.svg': vrowserSvg
  },
  vendorFiles: {},
  activeFile: '/App.svelte'
} satisfies FixtureManifest
