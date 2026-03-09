import type { FixtureManifest } from '../types.ts'

import indexHtml from './index.html?raw'
import mainTs from './main.ts?raw'
import counterTs from './counter.ts?raw'
import styleCss from './style.css?raw'
import dataYaml from './data.yaml?raw'
import vrowserSvg from './vrowser.svg?raw'
import typescriptSvg from './typescript.svg?raw'

export default {
  name: 'Vrowser Vanilla',
  files: {
    '/index.html': indexHtml,
    '/main.ts': mainTs,
    '/counter.ts': counterTs,
    '/style.css': styleCss,
    '/data.yaml': dataYaml,
    '/vrowser.svg': vrowserSvg,
    '/typescript.svg': typescriptSvg
  },
  vendorFiles: {},
  activeFile: '/main.ts'
} satisfies FixtureManifest
